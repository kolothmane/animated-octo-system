import { NextResponse } from 'next/server';
import { getLoggedUsername, saveSessionFromBrowserCookies } from '@/lib/instagram';

type IncomingCookie = {
  name?: string;
  value?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
  sameSite?: string;
};

function parseCookieString(cookieString: string): IncomingCookie[] {
  return cookieString
    .split(/;\s*/)
    .map((segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex <= 0) {
        return null;
      }

      const name = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      if (!name || !value) {
        return null;
      }

      return {
        name,
        value,
        domain: '.instagram.com',
        path: '/',
        secure: true,
        httpOnly: false,
      } satisfies IncomingCookie;
    })
    .filter((cookie): cookie is IncomingCookie => cookie !== null);
}

function normalizeIncomingCookies(body: unknown): IncomingCookie[] {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const payload = body as {
    cookies?: IncomingCookie[];
    cookieString?: string;
    sessionId?: string;
  };

  if (Array.isArray(payload.cookies) && payload.cookies.length > 0) {
    return payload.cookies
      .map((cookie) => ({
        name: String(cookie.name ?? '').trim(),
        value: String(cookie.value ?? '').trim(),
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate,
        sameSite: cookie.sameSite,
      }))
      .filter((cookie) => cookie.name && cookie.value);
  }

  if (typeof payload.cookieString === 'string' && payload.cookieString.trim()) {
    return parseCookieString(payload.cookieString);
  }

  if (typeof payload.sessionId === 'string' && payload.sessionId.trim()) {
    return [
      {
        name: 'sessionid',
        value: payload.sessionId.trim(),
        domain: '.instagram.com',
        path: '/',
        secure: true,
        httpOnly: true,
      },
    ];
  }

  return [];
}

export async function GET() {
  const username = await getLoggedUsername();
  return NextResponse.json({
    configured: !!username,
    username,
    defaultUsername: process.env.INSTAGRAM_TARGET_USERNAME ?? '',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookies = normalizeIncomingCookies(body);

    if (cookies.length === 0) {
      return NextResponse.json(
        {
          error: 'Aucun cookie Instagram valide reçu. L’extension doit envoyer le cookie complet.',
        },
        { status: 400 }
      );
    }

    const username = await saveSessionFromBrowserCookies(cookies);
    return NextResponse.json({ message: 'Session Instagram enregistrée avec succès', username });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
