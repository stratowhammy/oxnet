import prisma from './db';
import { maintainMarketMakerOrders } from './marketMaker';

// Constants
const FEE_PERCENTAGE = 0.005; // 0.5%
const MIN_POOL_LIQUIDITY = 1.0; // Prevent divide by zero

// Types
export interface TradeOrder {
    userId: string;
    assetId: string;
    type: 'BUY' | 'SELL' | 'SHORT';
    quantity: number;
    leverage?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    isInternal?: boolean;
}

export interface TradeResult {
    success: boolean;
    message: string;
    executionPrice?: number;
    totalCost?: number;
    fee?: number;
    priceImpact?: number;
}

export class AutomatedMarketMaker {

    static calculatePriceImpact(supplyPool: number, demandPool: number, orderSize: number, isBuy: boolean): number {
        if (supplyPool <= MIN_POOL_LIQUIDITY || demandPool <= MIN_POOL_LIQUIDITY) {
            return 0;
        }

        const k = supplyPool * demandPool;
        let newSupply: number;
        let newDemand: number;

        if (isBuy) {
            if (orderSize >= supplyPool) return 100;
            newSupply = supplyPool - orderSize;
            newDemand = k / newSupply;
        } else {
            newSupply = supplyPool + orderSize;
            newDemand = k / newSupply;
        }

        const currentPrice = demandPool / supplyPool;
        const newPrice = newDemand / newSupply;

        if (currentPrice === 0) return 0;
        return ((newPrice - currentPrice) / currentPrice) * 100;
    }

    static async executeTrade(order: TradeOrder): Promise<TradeResult> {
        const { userId, assetId, type, quantity } = order;
        const leverage = order.leverage || 1;

        if (quantity <= 0) {
            return { success: false, message: "Invalid quantity" };
        }

        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!asset || !user) return { success: false, message: "Asset or User not found" };

        if (asset.supplyPool <= MIN_POOL_LIQUIDITY || asset.demandPool <= MIN_POOL_LIQUIDITY) {
            return { success: false, message: "Insufficient market liquidity" };
        }

        const userPortfolios = await prisma.portfolio.findMany({ where: { userId } });
        const holdingAssetIds = [...new Set(userPortfolios.map(p => p.assetId))];
        const holdingAssets = await prisma.asset.findMany({ where: { id: { in: holdingAssetIds } } });

        let portfolioEquity = 0;
        for (const p of userPortfolios) {
            const a = holdingAssets.find(x => x.id === p.assetId);
            if (a) {
                const val = p.quantity * a.basePrice;
                if (p.isShortPosition) {
                    portfolioEquity -= val;
                } else {
                    portfolioEquity += val;
                }
            }
        }
        const totalEquity = user.deltaBalance - user.marginLoan + portfolioEquity;
        const maxPurchasingPower = Math.max(0, totalEquity) * leverage;

        const k = asset.supplyPool * asset.demandPool;
        let executionPrice = 0;
        let cost = 0;
        const priceImpact = this.calculatePriceImpact(asset.supplyPool, asset.demandPool, quantity, type === 'BUY');

        if (type === 'BUY') {
            if (quantity >= asset.supplyPool) return { success: false, message: "Order exceeds available supply" };

            const newSupply = asset.supplyPool - quantity;
            const newDemand = k / newSupply;
            const amountToPayToPool = newDemand - asset.demandPool;

            executionPrice = amountToPayToPool / quantity;
            const fee = amountToPayToPool * FEE_PERCENTAGE;
            cost = amountToPayToPool + fee;

            const existingShort = userPortfolios.find(p => p.assetId === assetId && p.isShortPosition);
            let qtyToCover = 0;
            let qtyToLong = quantity;
            if (existingShort && existingShort.quantity > 0) {
                qtyToCover = Math.min(quantity, existingShort.quantity);
                qtyToLong = quantity - qtyToCover;
            }

            if (cost > maxPurchasingPower && qtyToLong > 0) {
                return { success: false, message: `Insufficient margin. Max PP: ${maxPurchasingPower.toFixed(2)}, Req: ${cost.toFixed(2)}` };
            }

            const marginRequired = cost / leverage;
            const deltaToDeduct = Math.min(user.deltaBalance, marginRequired);
            const loanToAdd = cost - deltaToDeduct;

            const txOps: any[] = [
                prisma.user.update({
                    where: { id: userId },
                    data: {
                        deltaBalance: { decrement: deltaToDeduct },
                        marginLoan: { increment: loanToAdd }
                    }
                }),
                prisma.asset.update({
                    where: { id: assetId },
                    data: { supplyPool: newSupply, demandPool: newDemand, basePrice: executionPrice }
                }),
                prisma.transaction.create({
                    data: { userId, assetId, type: 'BUY', amount: quantity, price: executionPrice, fee }
                })
            ];

            if (qtyToCover > 0) {
                // To cover a short, we need to find the specific short position(s)
                // For simplicity, we find the oldest one first
                const targetShorts = await prisma.portfolio.findMany({
                    where: { userId, assetId, isShortPosition: true },
                    orderBy: { loanOriginatedAt: 'asc' } as any
                });

                let totalInterestPaid = 0;
                let totalPrincipalRepaid = 0;
                let remainingToCover = qtyToCover;

                for (const s of targetShorts as any[]) {
                    if (remainingToCover <= 0) break;
                    const canCover = Math.min(remainingToCover, s.quantity);

                    if (canCover === s.quantity) {
                        txOps.push(prisma.portfolio.delete({ where: { id: s.id } }));
                        totalInterestPaid += s.accruedInterest;
                        totalPrincipalRepaid += s.loanAmount;
                    } else {
                        const loanReduction = (canCover / s.quantity) * s.loanAmount;
                        const interestReduction = (canCover / s.quantity) * s.accruedInterest;

                        txOps.push((prisma as any).portfolio.update({
                            where: { id: s.id },
                            data: {
                                quantity: { decrement: canCover },
                                loanAmount: { decrement: loanReduction },
                                accruedInterest: { decrement: interestReduction }
                            }
                        }));
                        totalInterestPaid += interestReduction;
                        totalPrincipalRepaid += loanReduction;
                    }
                    remainingToCover -= canCover;
                }

                // To cover a short, you must BUY from the pool. Cost = amountToPayToPool (pro-rated for the cover part).
                const costOfCovering = (qtyToCover / quantity) * cost;

                // When they shorted, they gained `loanAmount` in cash (but it was locked as debt).
                // Now they are paying `costOfCovering` to close it.
                // Net change to their deltaBalance should be:
                // They keep the original cash they got (which is already in deltaBalance, we just decrement the debt loanAmount)
                // BUT they must PAY the costOfCovering and the totalInterestPaid from their deltaBalance.

                const finalDeltaDeduction = costOfCovering + totalInterestPaid;

                txOps.push(prisma.user.update({
                    where: { id: userId },
                    data: {
                        deltaBalance: { decrement: finalDeltaDeduction },
                        marginLoan: { decrement: totalPrincipalRepaid }
                    }
                }));
            }

            if (qtyToLong > 0) {
                const portfolioLoan = (qtyToLong / quantity) * loanToAdd;
                // ALWAYS create a NEW portfolio record for a new trade to track separate loans/interest
                txOps.push((prisma as any).portfolio.create({
                    data: {
                        userId,
                        assetId,
                        quantity: qtyToLong,
                        averageEntryPrice: executionPrice,
                        isShortPosition: false,
                        leverage: leverage,
                        liquidationPrice: executionPrice - (executionPrice / leverage),
                        takeProfitPrice: order.takeProfitPrice,
                        stopLossPrice: order.stopLossPrice,
                        loanAmount: portfolioLoan,
                        loanOriginatedAt: new Date(),
                        interestLastAccruedAt: new Date()
                    }
                }));
            }

            await prisma.$transaction(txOps);

            if (!order.isInternal) {
                await AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, executionPrice);
                await AutomatedMarketMaker.checkLiquidations(assetId);
                await maintainMarketMakerOrders(assetId);
            }

            return { success: true, message: "Buy executed", executionPrice, totalCost: cost, fee, priceImpact };

        } else if (type === 'SELL' || type === 'SHORT') {
            const newSupply = asset.supplyPool + quantity;
            const newDemand = k / newSupply;
            const amountReceivedFromPool = asset.demandPool - newDemand;

            executionPrice = amountReceivedFromPool / quantity;
            const fee = amountReceivedFromPool * FEE_PERCENTAGE;
            const proceeds = amountReceivedFromPool - fee;

            if (type === 'SELL') {
                const txOps: any[] = [];
                const targetPortfolios = await (prisma as any).portfolio.findMany({
                    where: { userId, assetId, isShortPosition: false },
                    orderBy: { loanOriginatedAt: 'asc' }
                });

                let totalInterestPaid = 0;
                let totalPrincipalRepaid = 0;
                let remainingToSell = quantity;

                for (const p of targetPortfolios as any[]) {
                    if (remainingToSell <= 0) break;
                    const canSell = Math.min(remainingToSell, p.quantity);

                    if (canSell === p.quantity) {
                        txOps.push(prisma.portfolio.delete({ where: { id: p.id } }));
                        totalInterestPaid += p.accruedInterest;
                        totalPrincipalRepaid += p.loanAmount;
                    } else {
                        // Partial close: pro-rate the loan reduction
                        const loanReduction = (canSell / p.quantity) * p.loanAmount;
                        // Partial close interest is tricky. For simplicity, we can let interest ride until full close,
                        // or charge a proportional amount. Let's charge proportional.
                        const interestReduction = (canSell / p.quantity) * p.accruedInterest;

                        txOps.push((prisma as any).portfolio.update({
                            where: { id: p.id },
                            data: {
                                quantity: { decrement: canSell },
                                loanAmount: { decrement: loanReduction },
                                accruedInterest: { decrement: interestReduction }
                            }
                        }));
                        totalInterestPaid += interestReduction;
                        totalPrincipalRepaid += loanReduction;
                    }
                    remainingToSell -= canSell;
                }

                // Distribute proceeds:
                // 1. Pay accrued interest first.
                // 2. Pay down margin loan principal.
                // 3. Any remainder goes to deltaBalance (Profit/Cash returned).
                // If proceeds are insufficient to cover the loan, we just pay down what we can, and deltaBalance might drop if they took a massive loss (though margin calls should prevent this). Actually, in OxNet, selling a long means returning the asset for cash. The cash *must* pay the loan.

                let cashNet = proceeds - totalInterestPaid;
                let principalToPay = totalPrincipalRepaid;

                // If they have enough cashNet to cover principal, the rest goes to their balance.
                // If they DON'T have enough (loss), cashNet - principal is negative, which reduces their overall deltaBalance.
                const finalDeltaChange = cashNet - principalToPay;

                txOps.push(prisma.user.update({
                    where: { id: userId },
                    data: {
                        deltaBalance: { increment: finalDeltaChange },
                        marginLoan: { decrement: totalPrincipalRepaid }
                    }
                }));

                await prisma.$transaction(txOps);

                if (!order.isInternal) {
                    await AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, executionPrice);
                    await maintainMarketMakerOrders(assetId);
                }

                return { success: true, message: "Sell executed", executionPrice, totalCost: -proceeds, fee, priceImpact };

            } else { // SHORT
                const notional = executionPrice * quantity;
                if (notional > maxPurchasingPower) {
                    return { success: false, message: `Insufficient margin. Max PP: ${maxPurchasingPower.toFixed(2)}, Req: ${notional.toFixed(2)}` };
                }

                const txOps: any[] = [
                    (prisma as any).user.update({
                        where: { id: userId },
                        data: {
                            deltaBalance: { increment: proceeds },
                            marginLoan: { increment: notional }
                        }
                    }),
                    (prisma as any).asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand, basePrice: executionPrice }
                    }),
                    (prisma as any).portfolio.create({
                        data: {
                            userId,
                            assetId,
                            quantity,
                            averageEntryPrice: executionPrice,
                            isShortPosition: true,
                            takeProfitPrice: order.takeProfitPrice,
                            stopLossPrice: order.stopLossPrice,
                            leverage: leverage,
                            liquidationPrice: executionPrice + (executionPrice / leverage),
                            loanAmount: notional,
                            loanOriginatedAt: new Date(),
                            interestLastAccruedAt: new Date()
                        }
                    }),
                    (prisma as any).transaction.create({
                        data: { userId, assetId, type: 'SHORT', amount: quantity, price: executionPrice, fee }
                    })
                ];

                await prisma.$transaction(txOps);

                if (!order.isInternal) {
                    await AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, executionPrice);
                    await AutomatedMarketMaker.checkLiquidations(assetId);
                    await maintainMarketMakerOrders(assetId);
                }

                return { success: true, message: "Short executed", executionPrice, totalCost: -proceeds, fee, priceImpact };
            }
        }
        return { success: false, message: "Invalid trade type" };
    }

    static async resolveCrossedLimitOrders(assetId: string, startPrice: number) {
        let currentPrice = startPrice;
        let iterations = 0;
        const MAX_ITERATIONS = 50; // Safety limit to prevent infinite loops

        console.log(`[AMM] Starting order resolution for asset ${assetId} at price ${startPrice.toFixed(4)}`);

        while (iterations < MAX_ITERATIONS) {
            // Find the best order that is crossed by the current price
            // Best = Highest BUY above price or Lowest SELL below price
            const bestBuy = await prisma.limitOrder.findFirst({
                where: { assetId, status: 'PENDING', type: { in: ['BUY', 'COVER'] }, price: { gte: currentPrice } },
                orderBy: { price: 'desc' }
            });

            const bestSell = await prisma.limitOrder.findFirst({
                where: { assetId, status: 'PENDING', type: { in: ['SELL', 'SHORT'] }, price: { lte: currentPrice } },
                orderBy: { price: 'asc' }
            });

            // If we have both, execute the one that is "closer" or just pick one (BUY first for stability?)
            // Actually, we should probably pick the one that is MOST crossed? 
            // Or just execute both sequentially in this iteration.

            let executedAny = false;

            // Handle BUYs
            if (bestBuy) {
                console.log(`[AMM] Cascade iteration ${iterations}: Found BUY order ${bestBuy.id} at ${bestBuy.price}`);
                const res = await AutomatedMarketMaker.executeTrade({
                    userId: bestBuy.userId,
                    assetId: bestBuy.assetId,
                    type: bestBuy.type === 'COVER' ? 'BUY' : 'BUY',
                    quantity: bestBuy.quantity,
                    leverage: bestBuy.leverage,
                    isInternal: true
                });

                if (res.success) {
                    await prisma.limitOrder.update({ where: { id: bestBuy.id }, data: { status: 'EXECUTED' } });
                    if (res.executionPrice) currentPrice = res.executionPrice;
                    executedAny = true;
                } else if (res.message && res.message.toLowerCase().includes('insufficient')) {
                    await prisma.limitOrder.update({ where: { id: bestBuy.id }, data: { status: 'CANCELLED' } });
                    executedAny = true; // Still marked as "changed" to re-check others
                }
            }

            // Handle SELLs (if no buy was executed or if we want to do both)
            // Re-check price if buy executed
            const bestSellRefresh = await prisma.limitOrder.findFirst({
                where: { assetId, status: 'PENDING', type: { in: ['SELL', 'SHORT'] }, price: { lte: currentPrice } },
                orderBy: { price: 'asc' }
            });

            if (bestSellRefresh) {
                console.log(`[AMM] Cascade iteration ${iterations}: Found SELL order ${bestSellRefresh.id} at ${bestSellRefresh.price}`);
                const res = await AutomatedMarketMaker.executeTrade({
                    userId: bestSellRefresh.userId,
                    assetId: bestSellRefresh.assetId,
                    type: bestSellRefresh.type === 'SHORT' ? 'SHORT' : 'SELL',
                    quantity: bestSellRefresh.quantity,
                    leverage: bestSellRefresh.leverage,
                    isInternal: true
                });

                if (res.success) {
                    await prisma.limitOrder.update({ where: { id: bestSellRefresh.id }, data: { status: 'EXECUTED' } });
                    if (res.executionPrice) currentPrice = res.executionPrice;
                    executedAny = true;
                } else if (res.message && res.message.toLowerCase().includes('insufficient')) {
                    await prisma.limitOrder.update({ where: { id: bestSellRefresh.id }, data: { status: 'CANCELLED' } });
                    executedAny = true;
                }
            }

            if (!executedAny) break;
            iterations++;
        }

        if (iterations > 0) {
            console.log(`[AMM] Order resolution for asset ${assetId} completed in ${iterations} iterations.`);
        }

        if (iterations >= MAX_ITERATIONS) {
            console.warn(`[AMM] Cascade reached MAX_ITERATIONS for asset ${assetId}. Potential infinite loop or massive volume.`);
        }
    }

    static async checkLiquidations(assetId: string) {
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return;
        const currentPrice = asset.basePrice;

        const portfolios = await (prisma as any).portfolio.findMany({
            where: { assetId }
        });

        for (const p of portfolios as any[]) {
            if (!p.liquidationPrice) continue;
            let shouldLiquidate = false;

            // Allow a tiny buffer to avoid rounding floats triggering premature liquidations
            if (p.isShortPosition && currentPrice >= (p.liquidationPrice - 0.001)) {
                shouldLiquidate = true;
            } else if (!p.isShortPosition && currentPrice <= (p.liquidationPrice + 0.001)) {
                shouldLiquidate = true;
            }

            if (shouldLiquidate) {
                console.log(`[LIQUIDATION] Portfolio ${p.id} (Short: ${p.isShortPosition}) for User ${p.userId} at price ${currentPrice.toFixed(4)} (Liq: ${p.liquidationPrice.toFixed(4)})`);
                await this.executeTrade({
                    userId: p.userId,
                    assetId: p.assetId,
                    type: p.isShortPosition ? 'BUY' : 'SELL', // Buying covers a short, Selling closes a long
                    quantity: p.quantity,
                    isInternal: true
                });
            }
        }
    }
}
