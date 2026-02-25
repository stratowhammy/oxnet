import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { userId, portfolioId, payAll } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { deltaBalance: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let totalInterestToPay = 0;
        let pidsToUpdate: string[] = [];

        if (payAll) {
            const portfolios = await prisma.portfolio.findMany({
                where: { userId, accruedInterest: { gt: 0 } },
                select: { id: true, accruedInterest: true }
            });
            totalInterestToPay = portfolios.reduce((sum, p) => sum + p.accruedInterest, 0);
            pidsToUpdate = portfolios.map(p => p.id);
        } else if (portfolioId) {
            const p = await prisma.portfolio.findUnique({
                where: { id: portfolioId, userId },
                select: { id: true, accruedInterest: true }
            });
            if (p) {
                totalInterestToPay = p.accruedInterest;
                pidsToUpdate = [p.id];
            }
        }

        if (totalInterestToPay <= 0) {
            return NextResponse.json({ message: 'No interest to pay' });
        }

        if (user.deltaBalance < totalInterestToPay) {
            return NextResponse.json({ error: 'Insufficient funds to pay interest' }, { status: 400 });
        }

        await (prisma as any).$transaction([
            (prisma as any).user.update({
                where: { id: userId },
                data: { deltaBalance: { decrement: totalInterestToPay } }
            }),
            (prisma as any).portfolio.updateMany({
                where: { id: { in: pidsToUpdate } },
                data: { accruedInterest: 0, interestLastAccruedAt: new Date() }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: `Paid Δ${totalInterestToPay.toFixed(2)} in interest`,
            amountPaid: totalInterestToPay
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
