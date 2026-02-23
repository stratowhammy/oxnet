import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen3';

const ROLE_PROMPTS: Record<string, string> = {
    CEO: 'a corporate CEO running a major company — give them a powerful, authoritative name',
    FACTORY_OWNER: 'a factory owner overseeing a manufacturing operation — give them a practical, industrialist name',
    SMALL_BUSINESS: 'a small business owner running a local enterprise — give them a down-to-earth, entrepreneurial name',
    UNION_LEADER: 'a union leader representing workers — give them a strong, working-class name',
    MAYOR: 'a city mayor governing a municipality — give them a distinguished, political name',
    POLITICIAN: 'a rising politician starting their career — give them a charismatic, memorable name',
    TRADER: 'a retail stock trader on the exchange floor — give them a sharp, street-smart name',
    HFM: 'a hedge fund manager handling massive portfolios — give them a sophisticated, Wall Street name',
};

// POST /api/auth/register — AI-generated character with role + municipality + password
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, playerRole, municipalityId, password } = body;

        if (!code || code.length !== 8) {
            return NextResponse.json({ error: 'An 8-character invite code is required' }, { status: 400 });
        }
        if (!playerRole) {
            return NextResponse.json({ error: 'A role selection is required' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Passphrase must be at least 6 characters' }, { status: 400 });
        }

        const upperCode = code.toUpperCase().trim();

        // Validate invite code
        const invite = await prisma.inviteCode.findUnique({ where: { code: upperCode } });
        if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        if (invite.used) return NextResponse.json({ error: 'This code has already been used' }, { status: 409 });

        // Validate chosen role against invite's allowed roles
        const allowedRoles = (invite as any).allowedRoles.split(',').map((r: string) => r.trim());
        if (!allowedRoles.includes(playerRole)) {
            return NextResponse.json({ error: `Role "${playerRole}" is not allowed by this invite code` }, { status: 403 });
        }

        // Determine Municipality
        let finalMunicipalityId = municipalityId;
        let municipality;

        if (playerRole === 'MAYOR') {
            // Hard assignment for Mayor: Find first municipality without a mayor
            municipality = await prisma.municipality.findFirst({
                where: { mayorId: null },
                orderBy: { name: 'asc' }
            });

            if (!municipality) {
                return NextResponse.json({ error: 'All administrative seats are currently occupied. Please choose another role or check back later.' }, { status: 409 });
            }
            finalMunicipalityId = municipality.id;
        } else {
            // Regular assignment: Use provided ID or fallback to first available if UI failed
            if (finalMunicipalityId) {
                municipality = await prisma.municipality.findUnique({ where: { id: finalMunicipalityId } });
            }

            if (!municipality) {
                municipality = await prisma.municipality.findFirst({ orderBy: { name: 'asc' } });
                if (!municipality) return NextResponse.json({ error: 'No municipalities found in system' }, { status: 404 });
                finalMunicipalityId = municipality.id;
            }
        }

        // Generate character name and backstory via Qwen3
        let characterName = `Agent-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        let backstory = `A mysterious figure who recently arrived in ${municipality.name}.`;

        try {
            const roleDesc = ROLE_PROMPTS[playerRole] || 'a character in a financial simulation';
            const prompt = `You are creating a fictional character for an economic simulation game called OxNet. This character is ${roleDesc}. They live in "${municipality.name}" — ${municipality.description || 'a city in the federation'}.

Generate a unique character. Respond with ONLY a JSON object (no markdown, no explanation):
{
  "name": "FirstName LastName",
  "backstory": "2-3 sentences about their history, personality, and ambitions in ${municipality.name}."
}

Rules:
- The name must be fictional and unique-sounding
- The backstory should reference their role and city
- Keep the tone professional but colorful
- No real-world figures`;

            const response = await fetch(LLM_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    messages: [
                        { role: 'system', content: 'You output only valid JSON. No markdown fences, no explanation.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.9
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.choices?.[0]?.message?.content) {
                    const raw = data.choices[0].message.content.trim();
                    const cleaned = raw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                    // Try to extract JSON from potential thinking tags
                    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.name && typeof parsed.name === 'string' && parsed.name.length >= 3) {
                            characterName = parsed.name.trim();
                        }
                        if (parsed.backstory && typeof parsed.backstory === 'string') {
                            backstory = parsed.backstory.trim();
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('AI name generation failed, using fallback:', e);
        }

        // Ensure name uniqueness (append number if collision)
        let finalName = characterName;
        let attempt = 0;
        while (await prisma.user.findFirst({ where: { username: finalName } })) {
            attempt++;
            finalName = `${characterName} ${attempt > 1 ? attempt : 'II'}`;
            if (attempt > 5) {
                finalName = `${characterName}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                break;
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create fully-onboarded user
        const newUser = await prisma.user.create({
            data: {
                username: finalName,
                password: hashedPassword,
                playerRole,
                onboarded: true,
                backstory,
                municipalityId: finalMunicipalityId,
                politicalRank: playerRole === 'POLITICIAN' ? 0 : 0,
            }
        });

        // If Mayor, link the municipality back
        if (playerRole === 'MAYOR') {
            await prisma.municipality.update({
                where: { id: finalMunicipalityId },
                data: { mayorId: newUser.id }
            });
        }

        // Mark code as used
        await prisma.inviteCode.update({
            where: { code: upperCode },
            data: { used: true, usedById: newUser.id, usedAt: new Date() }
        });

        // Create a welcome municipal event
        try {
            await prisma.municipalEvent.create({
                data: {
                    municipalityId: finalMunicipalityId,
                    eventType: 'ANNOUNCEMENT',
                    title: playerRole === 'MAYOR' ? `New Mayor Arrives: ${finalName}` : `New Resident: ${finalName}`,
                    content: playerRole === 'MAYOR'
                        ? `${finalName} has been appointed as the new Mayor of ${municipality.name}. ${backstory}`
                        : `${finalName}, a new ${playerRole.replace(/_/g, ' ').toLowerCase()}, has taken up residence in ${municipality.name}. ${backstory}`,
                }
            });
        } catch (e: any) {
            console.error('Failed to create welcome event:', e);
        }

        // Set session cookie
        const response = NextResponse.json({
            message: 'Character created. Welcome to OxNet.',
            userId: newUser.id,
            playerRole,
            characterName: finalName,
            backstory,
            municipality: municipality.name,
        });

        response.cookies.set('oxnet_session', newUser.id, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Registration error:', error);
        const message = error?.message || 'Unknown error';
        const code = error?.code || '';
        return NextResponse.json({ error: 'Internal server error', detail: message, code }, { status: 500 });
    }
}
