import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Flushing old news stories...");
    await prisma.newsStory.deleteMany();
    console.log("Old news flushed.");

    console.log("Generating 6 mock stories...");
    const mockStories = [
        {
            headline: "Tech Sector Faces Supply Constraints",
            context: "Recent [Technology](/?search=Technology) bottlenecks are disrupting the market. 'We anticipate minor headwinds,' says Dr. Harrison Wells, Chief Futurist at Institute for Advanced Studies.",
            targetSector: "Technology",
            targetSpecialty: "Semiconductors",
            impactScope: "SECTOR",
            direction: "DOWN",
            intensityWeight: 3,
            competitorInversion: false,
            summary: "Supply constraints are impacting the broader technology sector.",
            npcInvolved: "Dr. Harrison Wells",
            tags: JSON.stringify(["Technology", "Semiconductors", "Dr. Harrison Wells"])
        },
        {
            headline: "Healthcare Innovates With AI Models",
            context: "A breakthrough at [Pinnacle-DermaTech Corp](/?search=P-DERM) could change [Healthcare](/?search=Healthcare). 'This research is unprecedented,' noted Dr. Harrison Wells.",
            targetSector: "Healthcare",
            targetSpecialty: "Synthetic Skin",
            impactScope: "SPECIALTY",
            direction: "UP",
            intensityWeight: 4,
            competitorInversion: true,
            summary: "Pinnacle-DermaTech reports AI-assisted healthcare breakthrough.",
            npcInvolved: "Dr. Harrison Wells",
            tags: JSON.stringify(["Healthcare", "P-DERM", "AI"])
        },
        {
            headline: "Finance Firms Adopt New Standards",
            context: "Global standards are shifting for [Finance](/?search=Finance) institutions.",
            targetSector: "Finance",
            targetSpecialty: "Banking",
            impactScope: "SECTOR",
            direction: "UP",
            intensityWeight: 2,
            competitorInversion: false,
            summary: "New standards adopted across finance.",
            npcInvolved: null,
            tags: JSON.stringify(["Finance", "Banking"])
        },
        {
            headline: "Energy Disruption in Renewables",
            context: "Unexpected yields from [Helio Green Bond](/?search=H-GRN) have reshaped models.",
            targetSector: "Energy",
            targetSpecialty: "Renewable infrastructure",
            impactScope: "SPECIALTY",
            direction: "UP",
            intensityWeight: 5,
            competitorInversion: true,
            summary: "Helio Green Bond disrupts the energy sector.",
            npcInvolved: null,
            tags: JSON.stringify(["Energy", "H-GRN"])
        },
        {
            headline: "Consumer Goods Shows Resilience",
            context: "The [Consumer Goods](/?search=Consumer) sector is performing well despite odds.",
            targetSector: "Consumer Goods",
            targetSpecialty: "Retail",
            impactScope: "SECTOR",
            direction: "UP",
            intensityWeight: 1,
            competitorInversion: false,
            summary: "Consumer goods remain resilient.",
            npcInvolved: null,
            tags: JSON.stringify(["Consumer Goods"])
        },
        {
            headline: "Transportation Logistics Shakeup",
            context: "Major delays announced by [Logistics Prime](/?search=L-PRM).",
            targetSector: "Transportation",
            targetSpecialty: "Logistics",
            impactScope: "SPECIALTY",
            direction: "DOWN",
            intensityWeight: 3,
            competitorInversion: true,
            summary: "Logistics Prime faces severe delays.",
            npcInvolved: null,
            tags: JSON.stringify(["Transportation", "L-PRM", "Logistics"])
        }
    ];

    for (const data of mockStories) {
        await prisma.newsStory.create({ data });
    }
    console.log("\\nAll mock stories inserted successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
