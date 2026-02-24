import prisma from './db.js';
import { maintainMarketMakerOrders } from './marketMaker.js';

// Constants
const FEE_PERCENTAGE = 0.005; // 0.5%
const MIN_POOL_LIQUIDITY = 1.0; // Prevent divide by zero

export class AutomatedMarketMaker {

    static calculatePriceImpact(supplyPool, demandPool, orderSize, isBuy) {
        if (supplyPool <= MIN_POOL_LIQUIDITY || demandPool <= MIN_POOL_LIQUIDITY) {
            return 0;
        }

        const k = supplyPool * demandPool;
        let newSupply;
        let newDemand;

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

    static async executeTrade(order) {
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

            const txOps = [
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
                if (qtyToCover === existingShort.quantity) {
                    txOps.push(prisma.portfolio.delete({ where: { id: existingShort.id } }));
                } else {
                    txOps.push(prisma.portfolio.update({
                        where: { id: existingShort.id },
                        data: { quantity: { decrement: qtyToCover } }
                    }));
                }
            }
            if (qtyToLong > 0) {
                const existingLong = userPortfolios.find(p => p.assetId === assetId && !p.isShortPosition);
                let newAvgEntry = executionPrice;
                if (existingLong) {
                    newAvgEntry = (existingLong.quantity * existingLong.averageEntryPrice + qtyToLong * executionPrice) / (existingLong.quantity + qtyToLong);
                }

                const newLiqPrice = newAvgEntry - (newAvgEntry / leverage);
                const updateData = {
                    quantity: { increment: qtyToLong },
                    averageEntryPrice: newAvgEntry,
                    leverage: leverage,
                    liquidationPrice: newLiqPrice
                };
                const createData = {
                    userId, assetId, quantity: qtyToLong, averageEntryPrice: executionPrice, isShortPosition: false,
                    leverage: leverage,
                    liquidationPrice: executionPrice - (executionPrice / leverage)
                };

                if (order.takeProfitPrice !== undefined) { updateData.takeProfitPrice = order.takeProfitPrice; createData.takeProfitPrice = order.takeProfitPrice; }
                if (order.stopLossPrice !== undefined) { updateData.stopLossPrice = order.stopLossPrice; createData.stopLossPrice = order.stopLossPrice; }

                txOps.push(prisma.portfolio.upsert({
                    where: { userId_assetId_isShortPosition: { userId, assetId, isShortPosition: false } },
                    update: updateData,
                    create: createData
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
                const portfolio = userPortfolios.find(p => p.assetId === assetId && !p.isShortPosition);
                if (!portfolio || portfolio.quantity < quantity) return { success: false, message: "Insufficient holdings to sell" };

                let loanToPay = 0;
                let deltaToAdd = proceeds;
                if (user.marginLoan > 0) {
                    loanToPay = Math.min(proceeds, user.marginLoan);
                    deltaToAdd = proceeds - loanToPay;
                }

                const txOps = [
                    prisma.user.update({
                        where: { id: userId },
                        data: {
                            deltaBalance: { increment: deltaToAdd },
                            marginLoan: { decrement: loanToPay }
                        }
                    }),
                    prisma.asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand, basePrice: executionPrice }
                    }),
                    prisma.transaction.create({
                        data: { userId, assetId, type: 'SELL', amount: quantity, price: executionPrice, fee }
                    })
                ];

                if (portfolio.quantity === quantity) {
                    txOps.push(prisma.portfolio.delete({ where: { id: portfolio.id } }));
                } else {
                    txOps.push(prisma.portfolio.update({
                        where: { id: portfolio.id },
                        data: { quantity: { decrement: quantity } }
                    }));
                }

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

                const existingShort = userPortfolios.find(p => p.assetId === assetId && p.isShortPosition);
                let newAvgEntry = executionPrice;
                if (existingShort) {
                    newAvgEntry = (existingShort.quantity * existingShort.averageEntryPrice + quantity * executionPrice) / (existingShort.quantity + quantity);
                }

                const newLiqPrice = newAvgEntry + (newAvgEntry / leverage);

                const txOps = [
                    prisma.user.update({
                        where: { id: userId },
                        data: { deltaBalance: { increment: proceeds } }
                    }),
                    prisma.asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand, basePrice: executionPrice }
                    }),
                    prisma.portfolio.upsert({
                        where: { userId_assetId_isShortPosition: { userId, assetId, isShortPosition: true } },
                        update: {
                            quantity: { increment: quantity },
                            averageEntryPrice: newAvgEntry,
                            takeProfitPrice: order.takeProfitPrice,
                            stopLossPrice: order.stopLossPrice,
                            leverage: leverage,
                            liquidationPrice: newLiqPrice
                        },
                        create: {
                            userId,
                            assetId,
                            quantity,
                            averageEntryPrice: executionPrice,
                            isShortPosition: true,
                            takeProfitPrice: order.takeProfitPrice,
                            stopLossPrice: order.stopLossPrice,
                            leverage: leverage,
                            liquidationPrice: executionPrice + (executionPrice / leverage)
                        }
                    }),
                    prisma.transaction.create({
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

    static async resolveCrossedLimitOrders(assetId, startPrice) {
        let currentPrice = startPrice;
        let iterations = 0;
        const MAX_ITERATIONS = 50;

        console.log(`[AMM] Starting order resolution for asset ${assetId} at price ${startPrice.toFixed(4)}`);

        while (iterations < MAX_ITERATIONS) {
            const bestBuy = await prisma.limitOrder.findFirst({
                where: { assetId, status: 'PENDING', type: { in: ['BUY', 'COVER'] }, price: { gte: currentPrice } },
                orderBy: { price: 'desc' }
            });

            const bestSell = await prisma.limitOrder.findFirst({
                where: { assetId, status: 'PENDING', type: { in: ['SELL', 'SHORT'] }, price: { lte: currentPrice } },
                orderBy: { price: 'asc' }
            });

            let executedAny = false;

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
                    executedAny = true;
                }
            }

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

    static async checkLiquidations(assetId) {
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return;
        const currentPrice = asset.basePrice;

        const portfolios = await prisma.portfolio.findMany({
            where: { assetId }
        });

        for (const p of portfolios) {
            if (!p.liquidationPrice) continue;
            let shouldLiquidate = false;

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
