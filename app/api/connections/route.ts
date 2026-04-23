import { NextResponse } from 'next/server';
import { getOwnConnections, getLoggedUsername } from '@/lib/instagram';

export async function GET(): Promise<NextResponse> {
  try {
    const username = await getLoggedUsername();
    const { followers, following } = await getOwnConnections();
    return NextResponse.json({ username, followers, following });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };

    if (error.message === 'No Instagram session configured') {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    if (
      error.statusCode === 401 ||
      error.message?.toLowerCase().includes('login_required') ||
      error.message?.toLowerCase().includes('checkpoint')
    ) {
      return NextResponse.json({ error: 'Session expirée, veuillez vous reconnecter' }, { status: 401 });
    }

    console.error('Connections error:', error);
    return NextResponse.json({ error: error.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
