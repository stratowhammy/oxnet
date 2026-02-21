import Dashboard from "@/components/Dashboard";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch assets
  const assets = await prisma.asset.findMany({
    orderBy: { symbol: 'asc' }
  });

  // Fetch demo user (hardcoded for now to 'demo-user-1')
  // In a real app, this would get session user
  const user = await prisma.user.findUnique({
    where: { id: 'demo-user-1' },
    include: {
      portfolios: {
        include: {
          asset: true
        }
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
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p>Please ensure 'demo-user-1' exists in database.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950">
      <Dashboard initialUser={user} initialAssets={assets} />
    </main>
  );
}
