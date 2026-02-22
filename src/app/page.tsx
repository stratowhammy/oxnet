import Dashboard from "@/components/Dashboard";
import RoleSelection from "@/components/RoleSelection";
import prisma from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('oxnet_session');

  if (!session || !session.value) {
    redirect('/login');
  }

  // Fetch session user
  const user = await prisma.user.findUnique({
    where: { id: session.value },
    include: {
      portfolios: {
        include: {
          asset: true
        }
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  // If user hasn't onboarded yet (and not admin), show role selection
  if (!user.onboarded && user.role !== 'ADMIN') {
    // Get all assets and find which ones already have a CEO
    const allAssets = await prisma.asset.findMany({
      where: { symbol: { not: 'DELTA' } },
      orderBy: { symbol: 'asc' },
      select: { id: true, symbol: true, name: true, sector: true, niche: true }
    });

    const takenAssetIds = (await prisma.user.findMany({
      where: { playerRole: 'CEO', managedAssetId: { not: null } },
      select: { managedAssetId: true }
    })).map(u => u.managedAssetId);

    const availableCompanies = allAssets.filter(a => !takenAssetIds.includes(a.id));

    return (
      <main className="h-screen overflow-hidden bg-gray-950">
        <RoleSelection
          userId={user.id}
          username={user.username}
          availableCompanies={availableCompanies}
        />
      </main>
    );
  }

  // Fetch assets with their price history
  const assets = await prisma.asset.findMany({
    orderBy: { symbol: 'asc' },
    include: {
      priceHistory: {
        orderBy: { timestamp: 'asc' }
      },
      portfolios: {
        where: { isShortPosition: false }
      }
    }
  });

  // Fetch all news stories
  const news = await prisma.newsStory.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 50
  });

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      lendingLimit: true,
      lendingRate: true,
      loansGiven: {
        where: { status: 'ACTIVE' }
      }
    }
  });

  if (assets.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">System Not Initialized</h1>
          <p>No assets found. Please run the seed script.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-gray-950">
      <Dashboard initialUser={user} initialAssets={assets} initialNews={news} allUsers={allUsers} />
    </main>
  );
}
