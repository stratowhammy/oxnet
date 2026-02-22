import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');

        if (!session || !session.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const borrowerId = session.value;
        const body = await request.json();
        const { lenderId, borrowAmount } = body;

        if (!lenderId || !borrowAmount || borrowAmount <= 0) {
            return NextResponse.json({ error: 'Invalid borrow details provided' }, { status: 400 });
        }

        const requestedPrincipal = parseFloat(borrowAmount);

        if (borrowerId === lenderId) {
            return NextResponse.json({ error: 'Cannot borrow from yourself' }, { status: 400 });
        }

        // Fetch Lender
        const lender = await prisma.user.findUnique({
            where: { id: lenderId },
            include: { loansGiven: { where: { status: 'ACTIVE' } } }
        });

        if (!lender) return NextResponse.json({ error: 'Lender not found' }, { status: 404 });

        // Calculate available Lending Limit
        const activeLoansLent = lender.loansGiven.reduce((acc, loan) => acc + loan.principal, 0);
        const actualRemainingLimit = Math.max(0, lender.lendingLimit - activeLoansLent);

        // Calculate max physical balance of lender minus their margins
        const maxPhysicalAvailable = lender.deltaBalance - (lender.marginLoan || 0);
        const trueMaxToLend = Math.min(actualRemainingLimit, maxPhysicalAvailable);

        if (requestedPrincipal > trueMaxToLend) {
            return NextResponse.json({ error: 'Requested amount exceeds lender capacity' }, { status: 400 });
        }

        const initialDebt = requestedPrincipal * (1 + lender.lendingRate);

        // Execute Borrowing operation atomically
        await prisma.$transaction([
            prisma.user.update({
                where: { id: lender.id },
                data: { deltaBalance: { decrement: requestedPrincipal } }
            }),
            prisma.user.update({
                where: { id: borrowerId },
                data: { deltaBalance: { increment: requestedPrincipal } }
            }),
            prisma.loan.create({
                data: {
                    lenderId: lender.id,
                    borrowerId: borrowerId,
                    principal: requestedPrincipal,
                    interestRate: lender.lendingRate,
                    amountOwed: initialDebt,
                    status: 'ACTIVE'
                }
            })
        ]);

        return NextResponse.json({ message: `Successfully borrowed ${requestedPrincipal} Delta.` });

    } catch (error) {
        console.error("Borrow API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
