import Dashboard from "@/components/Dashboard";
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
    take: 50 // Keep the ticker lightweight
  });

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

  if (!user) {
    // If cookie is invalid or user was deleted
    redirect('/login');
  }

  return (
    <main className="h-screen overflow-hidden bg-gray-950">
      <Dashboard initialUser={user} initialAssets={assets} initialNews={news} allUsers={allUsers} />
    </main>
  );
}
