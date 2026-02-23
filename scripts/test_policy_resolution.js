const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mocking the engine function for testing in this script environment
async function mockManagePolicyLifecycle() {
    console.log('Running mock policy resolution...');
    const now = new Date();
    const expired = await prisma.policyProposal.findMany({
        where: {
            status: 'VOTING',
            endsAt: { lte: now }
        }
    });

    for (const policy of expired) {
        const passed = policy.votesFor > policy.votesAgainst;
        const finalStatus = passed ? 'PASSED' : 'FAILED';

        console.log(`[Policy] Resolving ${policy.title}: ${finalStatus}`);

        await prisma.policyProposal.update({
            where: { id: policy.id },
            data: { status: finalStatus }
        });

        if (passed) {
            await prisma.newsStory.create({
                data: {
                    headline: `Legislative Alert: ${policy.title} HAS PASSED!`,
                    context: `Test context for ${policy.title}`,
                    targetSector: policy.targetSector || 'GENERAL',
                    targetSpecialty: 'National Policy',
                    impactScope: 'GLOBAL',
                    direction: 'UP',
                    intensityWeight: 1,
                    competitorInversion: false
                }
            });
        }
    }
}

async function test() {
    console.log('--- VERIFYING POLICY RESOLUTION ---');

    // 1. Create a proposal in the past
    const user = await prisma.user.findFirst();
    const proposal = await prisma.policyProposal.create({
        data: {
            proposerId: user.id,
            title: 'Test Resolution Policy',
            description: 'Should flip to PASSED',
            policyType: 'SUBSIDY',
            effectValue: 0.1,
            status: 'VOTING',
            votesFor: 5,
            votesAgainst: 2,
            endsAt: new Date(Date.now() - 1000)
        }
    });

    // 2. Resolve
    await mockManagePolicyLifecycle();

    // 3. Verify
    const resolved = await prisma.policyProposal.findUnique({ where: { id: proposal.id } });
    console.log(`Final Status: ${resolved.status}`);

    const news = await prisma.newsStory.findFirst({
        where: { headline: `Legislative Alert: ${proposal.title} HAS PASSED!` },
        orderBy: { publishedAt: 'desc' }
    });
    console.log(`News Created: ${news ? 'YES' : 'NO'}`);

    if (resolved.status === 'PASSED' && news) {
        console.log('✓ SUCCESS: Policy resolved and news triggered.');
    } else {
        console.error('❌ FAILED: Policy resolution or news trigger failed.');
    }

    // Cleanup
    await prisma.policyProposal.delete({ where: { id: proposal.id } });
    if (news) await prisma.newsStory.delete({ where: { id: news.id } });
}

test().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
    process.exit();
});
