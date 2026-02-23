import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen3';

export async function POST(request: Request) {
    try {
        const { politicianId, question } = await request.json();

        if (!politicianId || !question) {
            return NextResponse.json({ error: 'Politician ID and question are required' }, { status: 400 });
        }

        const politician = await prisma.user.findUnique({
            where: { id: politicianId }
        });

        if (!politician || !politician.isNPC) {
            return NextResponse.json({ error: 'NPC Politician not found' }, { status: 404 });
        }

        const systemPrompt = `You are roleplaying as ${politician.username}, a politician in the OxNet simulation.
Your Role: ${politician.politicalRank === 4 ? 'President' : politician.politicalRank === 3 ? 'Senator' : 'Representative'}
Your Philosophy: ${politician.philosophy}
Your Traits: ${politician.traits}
Your Backstory: ${politician.backstory}

Respond to the user's question in your character's voice. 
Guidelines:
- Be concise (2-3 sentences max).
- Stay true to your philosophy and traits.
- Use a professional yet characteristic political tone.
- Do not break character.`;

        const response = await fetch(LLM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('LLM service failure');
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || "I have no comment at this time.";

        return NextResponse.json({ answer: answer.trim() });

    } catch (error) {
        console.error('Interview API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
