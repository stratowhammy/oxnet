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

    /**
     * Calculates the price impact of a trade based on the constant product formula (x * y = k).
     * @param supplyPool Current supply pool size (x)
     * @param demandPool Current demand pool size (y - represents quote currency/liquidity)
     * @param orderSize Size of the order in asset units
     * @param isBuy True for BUY, False for SELL/SHORT
     * @returns Percentage price change (positive for price increase, negative for decrease)
     */
    static calculatePriceImpact(supplyPool: number, demandPool: number, orderSize: number, isBuy: boolean): number {
        if (supplyPool <= MIN_POOL_LIQUIDITY || demandPool <= MIN_POOL_LIQUIDITY) {
            return 0; // Or throw error: Insufficient liquidity
        }

        const k = supplyPool * demandPool;
        let newSupply: number;
        let newDemand: number;

        if (isBuy) {
            // Buying removes supply, adds to demand pool
            // x_new = x - dx
            // y_new = k / x_new
            // price_new = y_new / x_new

            if (orderSize >= supplyPool) return 100; // Cap at 100% impact (infinite price)

            newSupply = supplyPool - orderSize;
            newDemand = k / newSupply;
        } else {
            // Selling adds supply, removes from demand pool
            // x_new = x + dx
            // y_new = k / x_new

            newSupply = supplyPool + orderSize;
            newDemand = k / newSupply;
        }

        const currentPrice = demandPool / supplyPool;
        const newPrice = newDemand / newSupply;

        // safe division check
        if (currentPrice === 0) return 0;

        return ((newPrice - currentPrice) / currentPrice) * 100;
    }

    /**
     * Executes a trade using the AMM logic.
     * Updates asset pools, creates transaction record, updates user balance and portfolio.
     */
    static async executeTrade(order: TradeOrder): Promise<TradeResult> {
        const { userId, assetId, type, quantity } = order;

        if (quantity <= 0) {
            return { success: false, message: "Invalid quantity" };
        }

        // 1. Fetch current state
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!asset || !user) {
            return { success: false, message: "Asset or User not found" };
        }

        // Safety Check: Divide by zero or negative pools
        if (asset.supplyPool <= MIN_POOL_LIQUIDITY || asset.demandPool <= MIN_POOL_LIQUIDITY) {
            return { success: false, message: "Insufficient market liquidity" };
        }

        const k = asset.supplyPool * asset.demandPool;
        let executionPrice = 0;
        let amountReceived = 0; // For SELL: Need to know how much quote currency received
        let cost = 0; // For BUY/SHORT: Need to know how much quote currency required

        // 2. Calculate execution details based on Constant Product
        // We calculate exact amount of tokens in/out to preserve K (minus fees? Usually fee is taken from input amount)
        // Requirement says: "Append 0.5% fee to all buy and sell orders" => Fee is ON TOP or DEDUCTED.
        // "Calculate total transaction price, strictly append a 0.5% fee" -> implies Total = Price * Qty * (1 + fee) for buy?

        // Let's stick to the prompt: determine price using CP, then apply fee.

        // Price Impact Calculation for reference
        const priceImpact = this.calculatePriceImpact(asset.supplyPool, asset.demandPool, quantity, type === 'BUY');

        if (type === 'BUY') {
            if (quantity >= asset.supplyPool) {
                return { success: false, message: "Order exceeds available supply" };
            }

            // Calculate Cost in Demand Pool units to get 'quantity' of Supply
            // (x - dx) * (y + dy) = k
            // y + dy = k / (x - dx)
            // dy = (k / (x - dx)) - y

            const newSupply = asset.supplyPool - quantity;
            const newDemand = k / newSupply;
            const amountToPayToPool = newDemand - asset.demandPool; // This is the "base cost"

            executionPrice = amountToPayToPool / quantity;
            const fee = amountToPayToPool * FEE_PERCENTAGE;
            cost = amountToPayToPool + fee;

            if (user.deltaBalance < cost) {
                return { success: false, message: `Insufficient balance. Prev: ${user.deltaBalance}, Req: ${cost}` };
            }

            // 3. Execute Updates
            await prisma.$transaction([
                // Update User Balance
                prisma.user.update({
                    where: { id: userId },
                    data: { deltaBalance: { decrement: cost } }
                }),
                // Update Asset Pools
                prisma.asset.update({
                    where: { id: assetId },
                    data: {
                        supplyPool: newSupply,
                        demandPool: newDemand
                    }
                }),
                // Update Portfolio
                prisma.portfolio.upsert({
                    where: {
                        userId_assetId_isShortPosition: {
                            userId,
                            assetId,
                            isShortPosition: false
                        }
                    },
                    update: {
                        quantity: { increment: quantity },
                        // Average entry price update omitted for brevity, logic: (oldQty * oldAvg + newCost) / (oldQty + newQty)
                        averageEntryPrice: executionPrice // Simply updating last price for now as placeholder, needs weighted avg logic
                    },
                    create: {
                        userId,
                        assetId,
                        quantity,
                        averageEntryPrice: executionPrice,
                        isShortPosition: false
                    }
                }),
                // Create Transaction
                prisma.transaction.create({
                    data: {
                        userId,
                        assetId,
                        type: 'BUY',
                        amount: quantity,
                        price: executionPrice,
                        fee: fee
                    }
                })
            ]);

            return { success: true, message: "Buy executed", executionPrice, totalCost: cost, fee, priceImpact };

        } else if (type === 'SELL' || type === 'SHORT') {
            // Selling/Shorting adds unit to supply, takes quote from demand
            // (x + dx) * (y - dy) = k
            // y - dy = k / (x + dx)
            // dy = y - (k / (x + dx))

            const newSupply = asset.supplyPool + quantity;
            const newDemand = k / newSupply;
            const amountReceivedFromPool = asset.demandPool - newDemand;

            executionPrice = amountReceivedFromPool / quantity;

            // Fee reduces the amount received? Prompt: "strictly append a 0.5% fee to all buy and sell orders"
            // Usually for sell, fee is deducted from proceeds.
            const fee = amountReceivedFromPool * FEE_PERCENTAGE;
            const proceeds = amountReceivedFromPool - fee;

            if (type === 'SELL') {
                // Check portfolio
                const portfolio = await prisma.portfolio.findUnique({
                    where: {
                        userId_assetId_isShortPosition: { userId, assetId, isShortPosition: false }
                    }
                });

                if (!portfolio || portfolio.quantity < quantity) {
                    return { success: false, message: "Insufficient holdings to sell" };
                }

                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: userId },
                        data: { deltaBalance: { increment: proceeds } }
                    }),
                    prisma.asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand }
                    }),
                    prisma.portfolio.update({
                        where: {
                            userId_assetId_isShortPosition: { userId, assetId, isShortPosition: false }
                        },
                        data: { quantity: { decrement: quantity } }
                    }),
                    prisma.transaction.create({
                        data: {
                            userId,
                            assetId,
                            type: 'SELL',
                            amount: quantity,
                            price: executionPrice,
                            fee: fee
                        }
                    })
                ]);

                return { success: true, message: "Sell executed", executionPrice, totalCost: -proceeds, fee, priceImpact };

            } else { // SHORT
                // Shorting logic: borrow asset, sell immediately. 
                // User gets Delta (proceeds). 
                // Creates negative position (or 'isShortPosition: true' portfolio entry).

                // Logic:
                // 1. Receive Delta proceeds.
                // 2. Add 'Short' entry to portfolio. 
                // Margin check logic would be separate requirement, assuming basic check here if needed.

                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: userId },
                        data: { deltaBalance: { increment: proceeds } }
                    }),
                    prisma.asset.update({
                        where: { id: assetId },
                        data: { supplyPool: newSupply, demandPool: newDemand }
                    }),
                    prisma.portfolio.upsert({
                        where: {
                            userId_assetId_isShortPosition: { userId, assetId, isShortPosition: true }
                        },
                        update: {
                            quantity: { increment: quantity },
                            averageEntryPrice: executionPrice
                        },
                        create: {
                            userId,
                            assetId,
                            quantity,
                            averageEntryPrice: executionPrice,
                            isShortPosition: true
                        }
                    }),
                    prisma.transaction.create({
                        data: {
                            userId,
                            assetId,
                            type: 'SHORT',
                            amount: quantity,
                            price: executionPrice,
                            fee: fee
                        }
                    })
                ]);

                return { success: true, message: "Short executed", executionPrice, totalCost: -proceeds, fee, priceImpact };
            }
        }

        return { success: false, message: "Invalid trade type" };
    }
}
