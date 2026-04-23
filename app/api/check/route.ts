import { NextResponse } from 'next/server';
import { getFollowers } from '@/lib/instagram';
import redis from '@/lib/redis';
import { sendTelegramMessage } from '@/lib/telegram';
import { getDefaultTargetUsername } from '@/lib/env';

function randomSleep(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request): Promise<NextResponse> {
  await randomSleep(500, 2000);

  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get('username') ?? getDefaultTargetUsername();
  const targetUsername = rawUsername.trim();

  if (!targetUsername) {
    return NextResponse.json({ error: 'username is required (query or env INSTAGRAM_TARGET_USERNAME)' }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(targetUsername)) {
    return NextResponse.json({ error: 'Invalid Instagram username' }, { status: 400 });
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
      await sendTelegramMessage('🔑 Session Instagram expirée. Merci de reconnecter via l’interface.');
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    console.error('Check error:', error);
    return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 });
  }
}
