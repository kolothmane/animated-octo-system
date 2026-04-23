import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

const KEY = 'ig:session_manual';

function normalizeValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function extractSessionId(input: string): string {
  const normalized = normalizeValue(input);

  // Case 1: full cookie string
  if (normalized.includes('sessionid=')) {
    const match = normalized.match(/sessionid=([^;\s]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Case 2: raw value only
  return normalized;
}

export async function GET() {
  const session = await redis.get(KEY);
  return NextResponse.json({ configured: !!session, defaultUsername: process.env.INSTAGRAM_TARGET_USERNAME ?? '' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = String(body?.sessionId ?? '');
    const sessionId = extractSessionId(rawInput);

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json(
        {
          error:
            'Sessionid invalide. Colle soit la valeur du cookie sessionid, soit un header Cookie contenant sessionid=...'
        },
        { status: 400 }
      );
    }

    await redis.set(
      KEY,
      JSON.stringify({
        cookies: [
          {
            key: 'sessionid',
            value: sessionId,
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: true
          }
        ]
      })
    );

    return NextResponse.json({ message: 'Session Instagram enregistrée avec succès' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
