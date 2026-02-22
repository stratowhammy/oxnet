import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/policy — list all proposals (optionally filter by proposerId)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const proposerId = searchParams.get('proposerId');

    try {
        const proposals = await prisma.policyProposal.findMany({
            where: proposerId ? { proposerId } : {},
            orderBy: { createdAt: 'desc' },
            include: { proposer: { select: { username: true } } }
        });
        return NextResponse.json(proposals);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
