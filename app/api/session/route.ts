import { NextResponse } from 'next/server';
import { getLoggedUsername, saveSessionFromBrowserCookies } from '@/lib/instagram';

type IncomingCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
  sameSite?: string;
};

function parseCookieString(cookieString: string): IncomingCookie[] {
  const segments = cookieString.split(/;\s*/);
  const cookies: IncomingCookie[] = [];

  for (const segment of segments) {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const name = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      continue;
    }

    cookies.push({
      name,
      value,
      domain: '.instagram.com',
      path: '/',
      secure: true,
      httpOnly: false,
    });
  }

  return cookies;
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
  const response = NextResponse.json({
    configured: !!username,
    username,
    defaultUsername: process.env.INSTAGRAM_TARGET_USERNAME ?? '',
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export async function OPTIONS() {
  const response = new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
  reconst response = NextResponse.json({ message: 'Session Instagram enregistrée avec succès', username });

  response.headers.set('Access-Control-Allow-Origin', '*');
  reconst response = NextResponse.json({ error: message }, { status: 400 });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response
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
