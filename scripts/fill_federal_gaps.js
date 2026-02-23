const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateNPC(role, rank) {
    const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
    const LLM_MODEL = process.env.LLM_MODEL || 'qwen3';

    console.log(`Generating gap-fill persona for ${role}...`);
    const prompt = `Create a unique political character for OxNet. Role: ${role}. Respond with ONLY JSON: { "name": "...", "philosophy": "...", "traits": "...", "backstory": "...", "characteristic": "..." }`;

    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [{ role: 'system', content: 'You output only valid JSON.' }, { role: 'user', content: prompt }],
                temperature: 0.9
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content.trim().replace(/^```json/i, '').replace(/```$/g, '');
            return JSON.parse(content);
        }
    } catch (e) { console.error(e); }
    return { name: `Official-${Math.random().toString(36).substring(7)}`, philosophy: "Stability.", traits: "Neutral", backstory: "Civil servant.", characteristic: "Efficient" };
}

async function main() {
    const targets = [
        { title: 'President', rank: 4, count: 1 },
        { title: 'Senator', rank: 3, count: 3 },
        { title: 'Representative', rank: 2, count: 5 }
    ];

    for (const t of targets) {
        const currentCountRaw = await prisma.$queryRaw`SELECT COUNT(*) as count FROM User WHERE politicalRank = ${t.rank} AND isNPC = 1`;
        const currentCount = Number(currentCountRaw[0].count);
        const needed = t.count - currentCount;

        console.log(`${t.title}: Have ${currentCount}, Need ${needed}`);

        for (let i = 0; i < needed; i++) {
            const profile = await generateNPC(t.title, t.rank);
            const id = Math.random().toString(36).substring(7);
            const backstory_bias = `${profile.backstory || 'Rising through the ranks.'} | Bias: ${profile.characteristic || 'Pragmatic'}`;

            const name = String(profile.name || `official_${id}`).replace(/'/g, "''");
            const traits = String(profile.traits || 'Neutral').replace(/'/g, "''");
            const philosophy = String(profile.philosophy || 'Administrative').replace(/'/g, "''");
            const b_bias = String(backstory_bias).replace(/'/g, "''");

            await prisma.$executeRawUnsafe(`
                INSERT INTO User (id, username, password, playerRole, politicalRank, isNPC, traits, philosophy, backstory, onboarded)
                VALUES (
                    '${id}', 
                    '${name}', 
                    'npc_protected_seat', 
                    'POLITICIAN', 
                    ${t.rank}, 
                    1, 
                    '${traits}', 
                    '${philosophy}', 
                    '${b_bias}', 
                    1
                )
            `);
            console.log(`Created ${t.title}: ${name}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
