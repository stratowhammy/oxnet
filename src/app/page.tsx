import TradingInterface from "@/components/TradingInterface";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const assets = await prisma.asset.findMany();

  if (assets.length === 0) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">System Not Initialized</h1>
          <p>No assets found. Please run the seed script.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <TradingInterface initialAssets={assets} />
    </main>
  );
}
