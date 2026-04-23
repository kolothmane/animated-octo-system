import { NextResponse } from 'next/server';
import { logoutAndClearSession } from '@/lib/instagram';

export async function POST(): Promise<NextResponse> {
  try {
    await logoutAndClearSession();
    return NextResponse.json({ message: 'Déconnecté avec succès' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
