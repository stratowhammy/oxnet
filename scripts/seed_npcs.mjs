import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const npcs = [
    { name: "President Valeria Vance", title: "President", institution: "Global Federation", category: "Government" },
    { name: "Dr. Aris Thorne", title: "Chairman", institution: "Central Reserve", category: "Government" },
    { name: "Minister Julian Kato", title: "Minister of Commerce", institution: "Global Federation", category: "Government" },
    { name: "Eleanor Sterling", title: "CEO", institution: "Sterling Vanguard Macro", category: "Finance" },
    { name: "Marcus Chen", title: "Head of Analytics", institution: "Apex Capital", category: "Finance" },
    { name: "Silvia Rossi", title: "Independent Wealth Manager", institution: "Rossi Wealth Management", category: "Finance" },
    { name: "Professor Elena Rostova", title: "Leading Economist", institution: "OxNet University", category: "Science" },
    { name: "Dr. Harrison Wells", title: "Chief Futurist", institution: "Institute for Advanced Studies", category: "Science" },
    { name: "Sarah Jenkins", title: "Lead Anchor", institution: "Market Master News", category: "Media" },
    { name: "David O'Connor", title: "Investigative Journalist", institution: "The Daily Chronicle", category: "Media" }
];

async function main() {
    console.log("Seeding NPCs...");
    for (const npc of npcs) {
        await prisma.nPC.upsert({
            where: { name: npc.name },
            update: { title: npc.title, institution: npc.institution, category: npc.category },
            create: npc
        });
    }
    console.log("NPCs seeded successfully.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
