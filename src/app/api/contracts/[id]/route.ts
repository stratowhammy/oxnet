import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/contracts/[id] — accept (PENDING→ACTIVE) or break (ACTIVE→BROKEN) a contract
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { userId, action } = await req.json(); // action: "ACCEPT" | "BREAK"
        const contractId = params.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.playerRole !== 'CEO') {
            return NextResponse.json({ error: 'Only CEOs can manage contracts' }, { status: 403 });
        }

        const contract = await prisma.supplyContract.findUnique({
            where: { id: contractId },
            include: { buyer: true, seller: true, good: true }
        });

        if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

        const managedId = user.managedAssetId;

        if (action === 'ACCEPT') {
            // Only the buyer CEO can accept a pending contract
            if (contract.buyerId !== managedId) {
                return NextResponse.json({ error: 'Only the buying company can accept this contract' }, { status: 403 });
            }
            if (contract.status !== 'PENDING') {
                return NextResponse.json({ error: 'Contract is not pending' }, { status: 400 });
            }

            const updated = await prisma.supplyContract.update({
                where: { id: contractId },
                data: { status: 'ACTIVE' }
            });
            return NextResponse.json(updated);

        } else if (action === 'BREAK') {
            // Either party can break an active contract
            if (contract.buyerId !== managedId && contract.sellerId !== managedId) {
                return NextResponse.json({ error: 'You are not a party to this contract' }, { status: 403 });
            }
            if (contract.status !== 'ACTIVE') {
                return NextResponse.json({ error: 'Contract is not active' }, { status: 400 });
            }

            // Apply a penalty to the breaker
            const breakerId = managedId;
            const breaker = contract.buyerId === breakerId ? contract.buyer : contract.seller;
            const penaltyPrice = breaker.basePrice * 0.97; // 3% penalty
            await prisma.asset.update({
                where: { id: breakerId! },
                data: { basePrice: penaltyPrice, demandPool: penaltyPrice * breaker.supplyPool }
            });

            const updated = await prisma.supplyContract.update({
                where: { id: contractId },
                data: { status: 'BROKEN' }
            });

            return NextResponse.json({ ...updated, penalty: true });

        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
