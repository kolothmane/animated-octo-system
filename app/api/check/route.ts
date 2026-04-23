import { NextResponse } from 'next/server';
import { getFollowers } from '@/lib/instagram';
import redis from '@/lib/redis';
import { sendTelegramMessage } from '@/lib/telegram';

function randomSleep(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request): Promise<NextResponse> {
  await randomSleep(500, 2000);

  const { searchParams } = new URL(request.url);
  const targetUsername = searchParams.get('username');
  if (!targetUsername) {
    return NextResponse.json({ error: 'username query parameter is required' }, { status: 400 });
  }

  const PREVIOUS_KEY = `followers:${targetUsername}:previous`;

  try {
    const currentFollowers = await getFollowers(targetUsername);

    const previousFollowers: string[] = await redis.smembers(PREVIOUS_KEY);

    const currentSet = new Set(currentFollowers);
    const previousSet = new Set(previousFollowers);

    const newFollowers = currentFollowers.filter((u) => !previousSet.has(u));
    const lostFollowers = previousFollowers.filter((u) => !currentSet.has(u));

    if (newFollowers.length > 0 || lostFollowers.length > 0) {
      const newList = newFollowers.length > 0 ? newFollowers.join(', ') : '—';
      const lostList = lostFollowers.length > 0 ? lostFollowers.join(', ') : '—';
      const message =
        `⚠️ Changement détecté sur ${targetUsername}\n` +
        `✅ Nouveau(x) : ${newList}\n` +
        `❌ Départ(s) : ${lostList}`;
      await sendTelegramMessage(message);
    }

    // Replace previous set with current list
    await redis.del(PREVIOUS_KEY);
    if (currentFollowers.length > 0) {
      await redis.sadd(PREVIOUS_KEY, currentFollowers[0], ...currentFollowers.slice(1));
    }

    return NextResponse.json({ checked: true, new: newFollowers, lost: lostFollowers });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };

    if (
      error.statusCode === 401 ||
      error.message?.includes('401') ||
      error.message?.toLowerCase().includes('login_required') ||
      error.message?.toLowerCase().includes('checkpoint')
    ) {
      await sendTelegramMessage(
        '🔑 Session Instagram expirée. Merci de mettre à jour IG_SESSION_ID.'
      );
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    console.error('Check error:', error);
    return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 });
  }
}
