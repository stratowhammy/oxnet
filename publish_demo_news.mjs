import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function demo() {
    console.log("Publishing demo news story...");

    await prisma.newsStory.create({
        data: {
            headline: "Tech Giants Converge: Pulse-Nexus Corp and Echo-Vortex Corp Announce Strategic Merger",
            context: "In a surprising move, the board of $P-NEX has approved a preliminary buyout offer for Echo-Vortex Corp ($E-VOR). Analysts expect this deal to consolidate the quantum encryption and generative AI sectors. While Pulse-Nexus Corp focuses on defense, Echo-Vortex Corp brings massive consumer-facing AI intelligence to the table. Trading for both $P-NEX and $E-VOR is expected to be volatile today.",
            targetSector: "Technology",
            targetSpecialty: "Mixed",
            impactScope: "GLOBAL",
            direction: "UP",
            intensityWeight: 4,
            competitorInversion: false
        }
    });

    console.log("Demo story published. Check the dashboard!");
}

demo().finally(() => prisma.$disconnect());
