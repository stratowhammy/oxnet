import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

// Role-aligned goal card definitions
const GOAL_DEFS: Record<string, { title: string; description: string; criteriaType: string; criteriaTarget: string; criteriaAmount: number; victoryPoints: number }[]> = {
    CEO: [
        { title: 'Empire Builder', description: 'Grow your total equity (Delta + stock value) to over Δ 500,000.', criteriaType: 'TOTAL_EQUITY', criteriaTarget: 'ANY', criteriaAmount: 500000, victoryPoints: 5 },
        { title: 'Majority Stakeholder', description: 'Hold at least 5,000 shares of the company you manage.', criteriaType: 'HOLD_ASSET_QUANTITY', criteriaTarget: 'MANAGED', criteriaAmount: 5000, victoryPoints: 4 },
    ],
    HEDGE_FUND: [
        { title: 'Fund Growth', description: 'Grow your total equity (Delta + stock value) to over Δ 250,000.', criteriaType: 'TOTAL_EQUITY', criteriaTarget: 'ANY', criteriaAmount: 250000, victoryPoints: 4 },
        { title: 'Diversified Portfolio', description: 'Hold at least 1,000 shares of any single asset.', criteriaType: 'HOLD_ASSET_QUANTITY', criteriaTarget: 'ANY', criteriaAmount: 1000, victoryPoints: 3 },
    ],
    RETAIL: [
        { title: 'Wealth Builder', description: 'Grow your total equity (Delta + stock value) to over Δ 150,000.', criteriaType: 'TOTAL_EQUITY', criteriaTarget: 'ANY', criteriaAmount: 150000, victoryPoints: 4 },
        { title: 'Market Maker', description: 'Hold at least 500 shares of any single asset.', criteriaType: 'HOLD_ASSET_QUANTITY', criteriaTarget: 'ANY', criteriaAmount: 500, victoryPoints: 2 },
    ],
};

async function assignRoleGoals(userId: string, role: string, managedAssetId?: string | null) {
    const defs = GOAL_DEFS[role] || GOAL_DEFS.RETAIL;

    for (const def of defs) {
        let criteriaTarget = def.criteriaTarget;
        if (criteriaTarget === 'MANAGED' && managedAssetId) {
            criteriaTarget = managedAssetId;
        } else if (criteriaTarget === 'MANAGED') {
            criteriaTarget = 'ANY';
        }

        let card = await prisma.goalCard.findFirst({
            where: { title: def.title, criteriaType: def.criteriaType, criteriaTarget, criteriaAmount: def.criteriaAmount }
        });

        if (!card) {
            card = await prisma.goalCard.create({
                data: { title: def.title, description: def.description, criteriaType: def.criteriaType, criteriaTarget, criteriaAmount: def.criteriaAmount, victoryPoints: def.victoryPoints }
            });
        }

        await prisma.userGoal.create({
            data: { userId, goalCardId: card.id, costPaid: 0 }
        });
    }
}

async function generateHandle(role: string, companyName?: string): Promise<string> {
    const roleContext = role === 'CEO'
        ? `a CEO running the company "${companyName}"`
        : role === 'HEDGE_FUND'
            ? 'a hedge fund manager'
            : 'a retail investor';

    const prompt = `Generate a single unique, memorable trading handle/identity for ${roleContext} on a stock exchange simulation. 
The handle should be creative, 1-2 words, no spaces, alphanumeric only (like a gamertag). 
Examples: "IronBull", "VaultKeeper", "DeltaHawk", "NightOwl99", "RedFox", "GhostTrader".
Output ONLY the handle, nothing else. No quotes, no explanation.`;

    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: 'system', content: 'Output only the requested text, no markdown, no explanation. Write at an 8th grade reading level.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 1.0,
                max_tokens: 20,
            })
        });

        if (response.ok) {
            const data = await response.json();
            const raw = data.choices?.[0]?.message?.content?.trim() || '';
            const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '');
            if (cleaned.length >= 3 && cleaned.length <= 20) {
                return cleaned;
            }
        }
    } catch (e: any) {
        console.error('Handle generation failed:', e);
    }

    const prefixes = ['Alpha', 'Delta', 'Ghost', 'Iron', 'Red', 'Night', 'Volt', 'Apex', 'Neon', 'Storm'];
    const suffixes = ['Trader', 'Bull', 'Fox', 'Hawk', 'Wolf', 'Shark', 'Bear', 'Falcon', 'Viper', 'Runner'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${prefix}${suffix}${num}`;
}

// POST /api/user/onboard — Set the player's role, generate handle, set password
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');
        if (!session?.value) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { role, assetId, password, step } = body;

        const userId = session.value;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (user.onboarded) return NextResponse.json({ error: 'Already onboarded' }, { status: 409 });

        // STEP 1: Pick role → generate handle
        if (step === 'PICK_ROLE') {
            if (!['CEO', 'HEDGE_FUND', 'RETAIL'].includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }

            if (role === 'CEO') {
                if (!assetId) return NextResponse.json({ error: 'CEO requires a company' }, { status: 400 });
                const existingCeo = await prisma.user.findFirst({
                    where: { managedAssetId: assetId, playerRole: 'CEO' }
                });
                if (existingCeo) return NextResponse.json({ error: 'Company already has a CEO' }, { status: 409 });
                const asset = await prisma.asset.findUnique({ where: { id: assetId } });
                if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
            }

            let handle = '';
            let attempts = 0;
            while (attempts < 5) {
                const companyName = role === 'CEO' && assetId
                    ? (await prisma.asset.findUnique({ where: { id: assetId } }))?.name
                    : undefined;
                handle = await generateHandle(role, companyName || undefined);
                const exists = await prisma.user.findUnique({ where: { username: handle } });
                if (!exists) break;
                attempts++;
            }

            if (!handle) {
                handle = `Trader${Date.now().toString(36)}`;
            }

            return NextResponse.json({ step: 'SET_PASSWORD', handle, role, assetId: assetId || null });
        }

        // STEP 2: Set password & finalize
        if (step === 'FINALIZE') {
            const { handle } = body;

            if (!handle || !password || password.length < 4) {
                return NextResponse.json({ error: 'Handle and password (min 4 chars) required' }, { status: 400 });
            }

            if (!['CEO', 'HEDGE_FUND', 'RETAIL'].includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }

            const handleTaken = await prisma.user.findFirst({
                where: { username: handle, id: { not: userId } }
            });
            if (handleTaken) {
                return NextResponse.json({ error: 'Handle was taken, please go back and try again' }, { status: 409 });
            }

            const updateData: Record<string, any> = {
                username: handle,
                password: password,
                playerRole: role,
                onboarded: true,
            };

            if (role === 'CEO') {
                if (!assetId) return NextResponse.json({ error: 'CEO requires a company' }, { status: 400 });
                const existingCeo = await prisma.user.findFirst({
                    where: { managedAssetId: assetId, playerRole: 'CEO' }
                });
                if (existingCeo) return NextResponse.json({ error: 'Company already has a CEO' }, { status: 409 });
                updateData.managedAssetId = assetId;
            }

            if (role === 'HEDGE_FUND') {
                updateData.hedgeFundBalance = 10_000_000;
            }

            const updated = await prisma.user.update({
                where: { id: userId },
                data: updateData,
            });

            // Auto-assign 2 role-aligned goal cards
            await assignRoleGoals(userId, role, role === 'CEO' ? assetId : null);

            return NextResponse.json({
                message: `Welcome, ${handle}! You are now a ${role === 'CEO' ? 'CEO' : role === 'HEDGE_FUND' ? 'Hedge Fund Manager' : 'Retail Investor'}.`,
                playerRole: updated.playerRole,
                username: updated.username,
            });
        }

        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    } catch (error) {
        console.error('Onboard error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
