import prisma from './db';

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

            let deltaToDeduct = cost;
            let loanToAdd = 0;
            if (user.deltaBalance >= cost) {
                deltaToDeduct = cost;
            } else {
                deltaToDeduct = Math.max(0, user.deltaBalance);
                loanToAdd = cost - deltaToDeduct;
            }

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
                    data: { supplyPool: newSupply, demandPool: newDemand }
                }),
                prisma.transaction.create({
                    data: { userId, assetId, type: 'BUY', amount: quantity, price: executionPrice, fee }
                })
            ];

            if (qtyToCover > 0) {
                if (qtyToCover === existingShort!.quantity) {
                    txOps.push(prisma.portfolio.delete({ where: { id: existingShort!.id } }));
                } else {
                    txOps.push(prisma.portfolio.update({
                        where: { id: existingShort!.id },
                        data: { quantity: { decrement: qtyToCover } }
                    }));
                }
            }
            if (qtyToLong > 0) {
                const updateData: any = { quantity: { increment: qtyToLong }, averageEntryPrice: executionPrice };
                const createData: any = { userId, assetId, quantity: qtyToLong, averageEntryPrice: executionPrice, isShortPosition: false };

                if (order.takeProfitPrice !== undefined) { updateData.takeProfitPrice = order.takeProfitPrice; createData.takeProfitPrice = order.takeProfitPrice; }
                if (order.stopLossPrice !== undefined) { updateData.stopLossPrice = order.stopLossPrice; createData.stopLossPrice = order.stopLossPrice; }

                txOps.push(prisma.portfolio.upsert({
                    where: { userId_assetId_isShortPosition: { userId, assetId, isShortPosition: false } },
                    update: updateData,
                    create: createData
                }));
            }

            await prisma.$transaction(txOps);
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

                const txOps: any[] = [
                    prisma.user.update({
                        where: { id: userId },
                        data: {
                            deltaBalance: { increment: deltaToAdd },
                            marginLoan: { decrement: loanToPay }
                        }
                    }),
                    prisma.asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand }
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
                return { success: true, message: "Sell executed", executionPrice, totalCost: -proceeds, fee, priceImpact };

            } else { // SHORT
                const notional = executionPrice * quantity;
                if (notional > maxPurchasingPower) {
                    return { success: false, message: `Insufficient margin. Max PP: ${maxPurchasingPower.toFixed(2)}, Req: ${notional.toFixed(2)}` };
                }

                const txOps: any[] = [
                    prisma.user.update({
                        where: { id: userId },
                        data: { deltaBalance: { increment: proceeds } }
                    }),
                    prisma.asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand }
                    }),
                    prisma.portfolio.upsert({
                        where: { userId_assetId_isShortPosition: { userId, assetId, isShortPosition: true } },
                        update: {
                            quantity: { increment: quantity },
                            averageEntryPrice: executionPrice,
                            takeProfitPrice: order.takeProfitPrice,
                            stopLossPrice: order.stopLossPrice
                        },
                        create: {
                            userId,
                            assetId,
                            quantity,
                            averageEntryPrice: executionPrice,
                            isShortPosition: true,
                            takeProfitPrice: order.takeProfitPrice,
                            stopLossPrice: order.stopLossPrice
                        }
                    }),
                    prisma.transaction.create({
                        data: { userId, assetId, type: 'SHORT', amount: quantity, price: executionPrice, fee }
                    })
                ];

                await prisma.$transaction(txOps);
                return { success: true, message: "Short executed", executionPrice, totalCost: -proceeds, fee, priceImpact };
            }
        }
        return { success: false, message: "Invalid trade type" };
    }
}
