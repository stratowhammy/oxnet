import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen/qwen3-vl-4b';

// GET /api/ceo/scenario — Get or generate a scenario for the logged-in CEO
export async function GET() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');
        if (!session?.value) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: session.value } });
        if (!user || user.playerRole !== 'CEO' || !user.managedAssetId) {
            return NextResponse.json({ error: 'You are not a CEO' }, { status: 403 });
        }

        const asset = await prisma.asset.findUnique({ where: { id: user.managedAssetId } });
        if (!asset) return NextResponse.json({ error: 'Managed company not found' }, { status: 404 });

        // Check for an existing unanswered scenario from today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        let scenario = await prisma.ceoScenario.findFirst({
            where: {
                userId: user.id,
                createdAt: { gte: todayStart },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (scenario) {
            return NextResponse.json({
                scenario,
                company: { symbol: asset.symbol, name: asset.name, sector: asset.sector, niche: asset.niche },
            });
        }

        // Generate a new scenario via AI
        const prompt = `You are generating a realistic business scenario for the CEO of "${asset.name}" (ticker: ${asset.symbol}), a company in the ${asset.sector} sector specializing in ${asset.niche}.

Create a challenging business decision the CEO must make today. The scenario should be specific to the company's industry and current market conditions.

Output ONLY valid JSON in this exact format:
{
  "Question": "A 2-3 sentence description of the business situation requiring a decision",
  "ChoiceA": "First option (1 sentence)",
  "ChoiceB": "Second option (1 sentence)",
  "ChoiceC": "Third option (1 sentence)"
}`;

        let aiData: any = null;
        try {
            const response = await fetch(LLM_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    messages: [
                        { role: 'system', content: 'You are a business scenario generator. Output pure JSON only, no markdown. All generated text must be written at an 8th grade reading level — use simple, clear language that a 13-year-old could understand.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.choices?.[0]?.message?.content) {
                    const content = data.choices[0].message.content.trim();
                    const cleaned = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                    aiData = JSON.parse(cleaned);
                }
            }
        } catch (e) {
            console.error('CEO scenario AI generation failed:', e);
        }

        // Fallback if AI fails
        if (!aiData) {
            aiData = {
                Question: `${asset.name} is facing increased competitive pressure in the ${asset.niche} space. Market analysts are watching closely for your next move. How do you respond?`,
                ChoiceA: `Increase R&D spending by 15% to accelerate product development and stay ahead of competitors.`,
                ChoiceB: `Launch an aggressive marketing campaign to capture market share before competitors can react.`,
                ChoiceC: `Pursue a strategic acquisition of a smaller competitor to consolidate your market position.`,
            };
        }

        scenario = await prisma.ceoScenario.create({
            data: {
                userId: user.id,
                assetId: asset.id,
                question: aiData.Question,
                choiceA: aiData.ChoiceA,
                choiceB: aiData.ChoiceB,
                choiceC: aiData.ChoiceC,
            }
        });

        return NextResponse.json({
            scenario,
            company: { symbol: asset.symbol, name: asset.name, sector: asset.sector, niche: asset.niche },
        });
    } catch (error) {
        console.error('CEO scenario GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/ceo/scenario — Submit an answer
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('oxnet_session');
        if (!session?.value) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await request.json();
        const { scenarioId, choice } = body;

        if (!scenarioId || !['A', 'B', 'C'].includes(choice)) {
            return NextResponse.json({ error: 'scenarioId and choice (A/B/C) required' }, { status: 400 });
        }

        const scenario = await prisma.ceoScenario.findUnique({ where: { id: scenarioId } });
        if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
        if (scenario.userId !== session.value) return NextResponse.json({ error: 'Not your scenario' }, { status: 403 });
        if (scenario.chosenOption) return NextResponse.json({ error: 'Already answered' }, { status: 409 });

        const updated = await prisma.ceoScenario.update({
            where: { id: scenarioId },
            data: {
                chosenOption: choice,
                answeredAt: new Date(),
            }
        });

        return NextResponse.json({
            message: 'Decision recorded. A news story will be published shortly based on your choice.',
            scenario: updated,
        });
    } catch (error) {
        console.error('CEO scenario POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
