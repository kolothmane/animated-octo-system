import { NextResponse } from 'next/server';
import { loginAndSaveSession } from '@/lib/instagram';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const username = String(body?.username ?? '').trim();
    const password = String(body?.password ?? '').trim();

    if (!username || !password) {
      return NextResponse.json({ error: 'username et password sont requis' }, { status: 400 });
    }

    const loggedUsername = await loginAndSaveSession(username, password);
    return NextResponse.json({ username: loggedUsername });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };

    if (
      error.message?.toLowerCase().includes('checkpoint') ||
      error.statusCode === 400
    ) {
      return NextResponse.json(
        { error: "Vérification Instagram requise (checkpoint). Connectez-vous manuellement sur l'application Instagram puis réessayez." },
        { status: 403 }
      );
    }

    if (
      error.statusCode === 401 ||
      error.message?.toLowerCase().includes('bad_password') ||
      error.message?.toLowerCase().includes('invalid_credentials')
    ) {
      return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect" }, { status: 401 });
    }

    console.error('Login error:', error);
    return NextResponse.json({ error: error.message ?? 'Erreur de connexion' }, { status: 500 });
  }
}
