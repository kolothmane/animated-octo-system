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
    const error = err as Error & { statusCode?: number; response?: any };
    console.error('Login error detail:', error);

    // Send the raw error to the frontend so the user can see what Instagram is actually asking for
    return NextResponse.json({ 
      error: error.message ?? 'Erreur de connexion', 
      details: error.response?.body || error.toString() 
    }, { status: 400 });
  }
}
