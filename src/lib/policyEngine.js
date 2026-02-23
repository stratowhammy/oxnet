import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculates active policy multipliers for a specific sector and target role.
 * 
 * Policy Types Supported:
 * - 'SUBSIDY': Boosts production 'unitsProduced'. effectValue is multiplier (e.g. 0.2 means +20%).
 * - 'TARIFF': Increases 'baseProductionCost'. effectValue is multiplier.
 * - 'DEREGULATION': Reduces wage demands or increases capacity (Phase 11+).
 * 
 * @param {string} sector - The sector to check (e.g. 'Energy', 'Mining').
 * @param {string} role - The playerRole to check (e.g. 'CEO', 'MAYOR').
 * @returns {Promise<{ productionMult: number, costMult: number }>}
 */
async function getActivePolicyModifiers(sector, role) {
    try {
        const activePolicies = await prisma.policyProposal.findMany({
            where: { status: 'PASSED' }
        });

        let productionMult = 1.0;
        let costMult = 1.0;

        for (const policy of activePolicies) {
            // Check if policy targets this sector or is global
            const sectorMatches = !policy.targetSector || policy.targetSector === sector;
            // Check if policy targets this role or is global
            const roleMatches = !policy.targetRole || policy.targetRole === role;

            if (sectorMatches && roleMatches) {
                if (policy.policyType === 'SUBSIDY') {
                    productionMult += policy.effectValue;
                } else if (policy.policyType === 'TARIFF') {
                    // Tariffs on inputs/production usually increase cost or decrease output
                    // Here we treat TARIFF as a production penalty if target sector is production
                    productionMult -= policy.effectValue;
                } else if (policy.policyType === 'TAX_HOLIDAY') {
                    costMult -= policy.effectValue;
                }
            }
        }

        // Clamp multipliers to sane levels
        return {
            productionMult: Math.max(0.1, productionMult),
            costMult: Math.max(0.1, costMult)
        };
    } catch (e) {
        console.error('[PolicyEngine] Error fetching policies:', e);
        return { productionMult: 1.0, costMult: 1.0 };
    }
}

export { getActivePolicyModifiers };
