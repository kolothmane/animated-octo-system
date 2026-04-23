import { IgApiClient } from 'instagram-private-api';
import redis from './redis';

const IPHONE_USER_AGENTS = [
  'Instagram 275.0.0.27.98 (iPhone13,2; iOS 16_3_1; en_US; en-US; scale=3.00; 1170x2532; 458940375)',
  'Instagram 274.0.0.18.102 (iPhone14,3; iOS 16_2; en_US; en-US; scale=3.00; 1284x2778; 456399956)',
  'Instagram 273.0.0.16.101 (iPhone12,1; iOS 15_7; en_US; en-US; scale=2.00; 828x1792; 454555118)',
  'Instagram 272.0.0.15.98 (iPhone11,2; iOS 15_6_1; en_US; en-US; scale=3.00; 1125x2436; 452849028)',
  'Instagram 271.0.0.14.100 (iPhone13,4; iOS 16_1; en_US; en-US; scale=3.00; 1284x2778; 451043938)',
];

function randomUserAgent(): string {
  return IPHONE_USER_AGENTS[Math.floor(Math.random() * IPHONE_USER_AGENTS.length)];
}

function randomSleep(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFollowers(targetUsername: string): Promise<string[]> {
  const client = new IgApiClient();
  client.state.generateDevice(process.env.IG_SESSION_ID ?? 'default_device_seed');
  // Override user agent with a random iPhone UA
  (client.state as unknown as { userAgent: string }).userAgent = randomUserAgent();

  // Try to restore session from Redis
  const savedSession = await redis.get<string>('ig:session');
  if (savedSession) {
    await client.state.deserializeCookieJar(
      typeof savedSession === 'string' ? savedSession : JSON.stringify(savedSession)
    );
  } else if (process.env.IG_SESSION_ID) {
    // Bootstrap from the raw session-id cookie value provided via env
    await client.state.deserializeCookieJar(
      JSON.stringify({
        cookies: [
          {
            key: 'sessionid',
            value: process.env.IG_SESSION_ID,
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: true,
          },
        ],
      })
    );
  }

  await randomSleep(1000, 4000);

  const targetUser = await client.user.searchExact(targetUsername);
  const followersFeed = client.feed.accountFollowers(targetUser.pk);

  const usernames: string[] = [];
  let page = await followersFeed.items();
  page.forEach((u) => usernames.push(u.username));

  while (followersFeed.isMoreAvailable()) {
    await randomSleep(1000, 4000);
    page = await followersFeed.items();
    page.forEach((u) => usernames.push(u.username));
  }

  // Persist updated session back to Redis
  const serialized = await client.state.serializeCookieJar();
  await redis.set('ig:session', serialized);

  return usernames;
}
