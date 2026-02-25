import prisma from "@/lib/db";

export type GoalStatus = "EARNED" | "POTENTIAL";

// Utility to check if a specific userId actively meets the criteria of a specific goalCardId
export async function evaluateGoalStatus(userId: string, goalCardId: string): Promise<GoalStatus> {
    const goal = await prisma.goalCard.findUnique({
        where: { id: goalCardId }
    });

    if (!goal) return "POTENTIAL";

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            portfolios: {
                include: { asset: true }
            }
        }
    });

    if (!user) return "POTENTIAL";

    if (goal.criteriaType === "TOTAL_EQUITY") {
        let stockValue = 0;
        for (const port of user.portfolios) {
            stockValue += (port.quantity * port.asset.basePrice);
        }
        // Simplified Equity = Delta + Gross Stock Value (ignoring margin loans for simplicity context)
        const equity = user.deltaBalance + stockValue;

        if (equity >= goal.criteriaAmount) {
            return "EARNED";
        }
        return "POTENTIAL";
    }

    if (goal.criteriaType === "HOLD_ASSET_QUANTITY") {
        if (goal.criteriaTarget === "ANY") {
            // Check if ANY portfolio item >= criteriaAmount
            const meetsAny = user.portfolios.some(p => p.quantity >= goal.criteriaAmount);
            if (meetsAny) return "EARNED";
            return "POTENTIAL";
        } else {
            // Must hold specific asset
            const specificPort = user.portfolios.find(p => p.assetId === goal.criteriaTarget);
            if (specificPort && specificPort.quantity >= goal.criteriaAmount) {
                return "EARNED";
            }
            return "POTENTIAL";
        }
    }

    if (goal.criteriaType === "HOLD_SECTOR_NOTIONAL") {
        let sectorNotional = 0;
        for (const port of user.portfolios) {
            if (port.asset.sector === goal.criteriaTarget || goal.criteriaTarget === "ANY") {
                sectorNotional += (port.quantity * port.asset.basePrice);
            }
        }

        if (sectorNotional >= goal.criteriaAmount) {
            return "EARNED";
        }
        return "POTENTIAL";
    }

    // Default fallback
    return "POTENTIAL";
}
