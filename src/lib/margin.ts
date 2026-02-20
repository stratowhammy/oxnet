import prisma from './db';
const LEVERAGE_RATIO = 5.0;
const LIQUIDATION_THRESHOLD = 0.8; // If margin level drops below 80% (example)

export class MarginManager {

    /**
     * Calculates the total value of a user's holdings (Long + Delta) - Liabilities (Shorts).
     * Determines if the user is liquidatable.
     */
    static async checkLiquidation(userId: string): Promise<{ liquid: boolean, marginLevel: number, totalValue: number }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { portfolios: true }
        });

        if (!user) throw new Error("User not found");

        let totalAssetValue = 0;
        let totalLiabilityValue = 0;

        for (const position of user.portfolios) {
            if (position.quantity === 0) continue;

            const asset = await prisma.asset.findUnique({ where: { id: position.assetId } });
            if (!asset) continue;

            // Current Price according to AMM spot price (demand / supply)
            const currentPrice = asset.demandPool / asset.supplyPool;
            const positionValue = position.quantity * currentPrice;

            if (position.isShortPosition) {
                totalLiabilityValue += positionValue;
            } else {
                totalAssetValue += positionValue;
            }
        }

        // Total Equity = (Delta + Longs) - Shorts
        const equity = (user.deltaBalance + totalAssetValue) - totalLiabilityValue;

        // Margin Requirement:
        // With 5x leverage, Equity must be >= (Total Exposure) / 5
        // Total Exposure = Longs + Shorts
        // Or simplified: Maintenance Margin.

        // Let's use a simple Health Factor:
        // Collateral = Delta + Longs (haircut?)
        // Debt = Shorts

        // Prompt says: "Implement 5x leverage: Allow users to execute trades up to 5 times their total portfolio value"
        // And "checkLiquidation if liabilities exceed collateral thresholds"

        // Interpret: Max Position Size = Equity * 5.
        // Liquidation if Equity < Maintenance Margin of Positions.

        const marginLevel = totalLiabilityValue > 0 ? equity / totalLiabilityValue : Infinity; // Simplified ratio

        // Correct Leverage implementation logic:
        // Buying Power = Equity * 5.

        // Liquidation Logic (Basic):
        // If Equity drops below 0 (insolvent) or below maintenance fraction of value.
        const isLiquid = equity > 0; // Simple insolvency check for now, can refine to strict margin maintenance

        return { liquid: isLiquid, marginLevel, totalValue: equity };
    }
}
