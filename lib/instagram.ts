import { IgApiClient } from 'instagram-private-api';
import redis from './redis';

const SESSION_KEY = 'ig:session_manual';
const LOGGED_USER_KEY = 'ig:logged_username';

async function buildClientFromSession(): Promise<IgApiClient> {
  const client = new IgApiClient();

  const saved = await redis.get<string>(SESSION_KEY);
  if (!saved) {
    throw new Error('No Instagram session configured');
  }

  const raw = typeof saved === 'string' ? saved : JSON.stringify(saved);
  await client.state.deserialize(raw);
  return client;
}

export async function loginAndSaveSession(username: string, password: string): Promise<string> {
  const client = new IgApiClient();
  client.state.generateDevice(username);

  await client.account.login(username, password);

  const serialized = await client.state.serialize();
  await redis.set(SESSION_KEY, JSON.stringify(serialized));
  await redis.set(LOGGED_USER_KEY, username);

  return username;
}

export async function getLoggedUsername(): Promise<string | null> {
  return redis.get<string>(LOGGED_USER_KEY);
}

export async function logoutAndClearSession(): Promise<void> {
  await redis.del(SESSION_KEY);
  await redis.del(LOGGED_USER_KEY);
}

export async function getOwnConnections(): Promise<{ followers: string[]; following: string[] }> {
  const client = await buildClientFromSession();

  const me = await client.account.currentUser();
  const pk = me.pk;

  const followersFeed = client.feed.accountFollowers(pk);
  const followingFeed = client.feed.accountFollowing(pk);

  const followers: string[] = [];
  const following: string[] = [];

  do {
    const page = await followersFeed.items();
    page.forEach((u) => followers.push(u.username));
  } while (followersFeed.isMoreAvailable());

  do {
    const followingPage = await followingFeed.items();
    followingPage.forEach((u) => following.push(u.username));
  } while (followingFeed.isMoreAvailable());

  return { followers, following };
}

export async function getFollowers(targetUsername: string): Promise<string[]> {
  const client = await buildClientFromSession();

  const targetUser = await client.user.searchExact(targetUsername);
  const followersFeed = client.feed.accountFollowers(targetUser.pk);

  const usernames: string[] = [];

  do {
    const page = await followersFeed.items();
    page.forEach((u) => usernames.push(u.username));
  } while (followersFeed.isMoreAvailable());

  return usernames;
}
