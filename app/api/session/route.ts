import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

const KEY = 'ig:session_manual';

function normalizeSessionId(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) return '';

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function GET() {
  const session = await redis.get(KEY);
  return NextResponse.json({ configured: !!session, defaultUsername: process.env.INSTAGRAM_TARGET_USERNAME ?? '' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = normalizeSessionId(body?.sessionId ?? '');

    if (!sessionId || sessionId.length < 10) {
      return NextResponse.json({ error: 'Sessionid invalide' }, { status: 400 });
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
            httpOnly: true,
          },
        ],
      })
    );

    return NextResponse.json({ message: 'Session Instagram enregistrée avec succès' });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
