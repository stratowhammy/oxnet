const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen3';

async function generateNPC(role, rank) {
    console.log(`Generating persona for ${role}...`);
    const prompt = `Create a high-fidelity political character for a simulation game called OxNet.
Role: ${role} (Rank: ${rank})

We need a unique identity. Respond with ONLY a JSON object:
{
  "name": "Full Name",
  "philosophy": "A 1-sentence core political belief (e.g. 'Aggressive industrial expansion with minimal regulation.')",
  "traits": "3-4 comma-separated descriptors (e.g. 'Charismatic, Ruthless, Detail-oriented')",
  "backstory": "2-3 sentences about their rise to power and what they stand for.",
  "characteristic": "A specific decision-making bias (e.g. 'Always favors heavy industry over environmental concerns')"
}

Rules:
- Professional but distinct tone
- No real-world figures
- Make them feel like 'stand-in' pillars of power`;

    try {
        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: 'system', content: 'You output only valid JSON. No markdown.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.9
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            const json = JSON.parse(content.replace(/^```json/i, '').replace(/```$/g, ''));
            return json;
        }
    } catch (e) {
        console.error(`LLM failed for ${role}, using fallback.`, e);
    }

    return {
        name: `${role} ${Math.floor(Math.random() * 100)}`,
        philosophy: "Standard administrative oversight.",
        traits: "Diligent, Observant, Neutral",
        backstory: "A long-time civil servant who rose through the ranks.",
        characteristic: "Prioritizes stability above all else."
    };
}

async function main() {
    const roles = [
        { title: 'President', rank: 4, count: 1 },
        { title: 'Senator', rank: 3, count: 3 },
        { title: 'Representative', rank: 2, count: 5 }
    ];

    for (const r of roles) {
        for (let i = 0; i < r.count; i++) {
            const profile = await generateNPC(r.title, r.rank);

            // Use raw SQL to bypass stale Prisma client validation on Windows
            await prisma.$executeRaw`
                INSERT INTO User (id, username, password, playerRole, politicalRank, isNPC, traits, philosophy, backstory, onboarded)
                VALUES (
                    ${Math.random().toString(36).substring(7)}, 
                    ${profile.name}, 
                    'npc_protected_seat', 
                    'POLITICIAN', 
                    ${r.rank}, 
                    1, 
                    ${profile.traits}, 
                    ${profile.philosophy}, 
                    ${profile.backstory} || ' | Bias: ' || ${profile.characteristic}, 
                    1
                )
            `;
            console.log(`Created ${r.title}: ${profile.name}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
