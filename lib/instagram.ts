import { IgApiClient } from 'instagram-private-api';
import redis from './redis';

const KEY = 'ig:session_manual';

export async function getFollowers(targetUsername: string): Promise<string[]> {
  const client = new IgApiClient();

  const saved = await redis.get<string>(KEY);

  if (!saved) {
    throw new Error('No Instagram session configured');
  }

  await client.state.deserializeCookieJar(
    typeof saved === 'string' ? saved : JSON.stringify(saved)
  );

  const targetUser = await client.user.searchExact(targetUsername);
  const followersFeed = client.feed.accountFollowers(targetUser.pk);

  const usernames: string[] = [];

  let page = await followersFeed.items();
  page.forEach((u) => usernames.push(u.username));

  while (followersFeed.isMoreAvailable()) {
    page = await followersFeed.items();
    page.forEach((u) => usernames.push(u.username));
  }

  return usernames;
}
