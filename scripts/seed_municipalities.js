import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const municipalities = [
    { name: 'New Oxford', description: 'The financial capital — home to the largest banks, hedge funds, and the OxNet Central Exchange. Gleaming skyscrapers line the waterfront.' },
    { name: 'Port Meridian', description: 'A bustling coastal trade port where foreign goods enter the federation. Shipping magnates and logistics empires dominate the skyline.' },
    { name: 'Ironhaven', description: 'The industrial manufacturing heartland. Foundries, assembly lines, and factory smokestacks define this blue-collar powerhouse.' },
    { name: 'Silverpine', description: 'A sleek tech and innovation district. Startups, research labs, and digital infrastructure firms compete for the next breakthrough.' },
    { name: 'Crestfall', description: 'Deep in mining country — rich in rare minerals and natural resources. Extraction companies and energy firms rule here.' },
    { name: 'Thornfield', description: 'The agricultural heartland. Vast farmlands, food processing plants, and commodity markets feed the entire federation.' },
    { name: 'Ashford', description: 'The cultural and media capital. News outlets, entertainment conglomerates, and creative industries thrive in this vibrant city.' },
];

async function main() {
    for (const m of municipalities) {
        await prisma.municipality.upsert({
            where: { name: m.name },
            update: { description: m.description },
            create: { name: m.name, description: m.description },
        });
        console.log(`✓ Municipality: ${m.name}`);
    }
    console.log('\\nAll 7 municipalities seeded.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
