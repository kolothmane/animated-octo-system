import { IgApiClient } from 'instagram-private-api';
import redis from './redis';

const SESSION_KEY = 'ig:session_manual';
const LOGGED_USER_KEY = 'ig:logged_username';
const DEVICE_SEED = 'chrome-extension-session';

type BrowserCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
  sameSite?: string;
};

type SerializedCookie = {
  key: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  hostOnly: boolean;
  creation: string;
  lastAccessed: string;
  sameSite?: string;
  expires?: string;
};

type SerializedCookieJar = {
  version: string;
  storeType: string;
  rejectPublicSuffixes: boolean;
  enableLooseMode: boolean;
  cookies: SerializedCookie[];
};

function normalizeDomain(domain: string | undefined): { domain: string; hostOnly: boolean } {
  const normalized = domain?.trim() || '.instagram.com';
  return {
    domain: normalized,
    hostOnly: !normalized.startsWith('.'),
  };
}

function toSerializedCookieJar(cookies: BrowserCookie[]): SerializedCookieJar {
  const now = new Date().toISOString();

  return {
    version: 'tough-cookie@4',
    storeType: 'MemoryCookieStore',
    rejectPublicSuffixes: true,
    enableLooseMode: true,
    cookies: cookies
      .filter((cookie) => cookie.name && cookie.value !== undefined)
      .map((cookie) => {
        const { domain, hostOnly } = normalizeDomain(cookie.domain);
        return {
          key: cookie.name,
          value: String(cookie.value),
          domain,
          path: cookie.path?.trim() || '/',
          secure: !!cookie.secure,
          httpOnly: !!cookie.httpOnly,
          hostOnly,
          creation: now,
          lastAccessed: now,
          sameSite: cookie.sameSite,
          expires:
            typeof cookie.expirationDate === 'number'
              ? new Date(cookie.expirationDate).toISOString()
              : undefined,
        };
      }),
  };
}

async function createClientFromStoredSession(): Promise<IgApiClient> {
  const saved = await redis.get<string>(SESSION_KEY);
  if (!saved) {
    throw new Error('No Instagram session configured');
  }

  const client = new IgApiClient();
  client.state.generateDevice(DEVICE_SEED);
  await client.state.deserialize(saved);
  await client.qe.syncLoginExperiments();
  return client;
}

async function persistClientSession(client: IgApiClient, username: string): Promise<void> {
  const serialized = (await client.state.serialize()) as Record<string, unknown>;
  delete serialized.constants;
  await redis.set(SESSION_KEY, JSON.stringify(serialized));
  await redis.set(LOGGED_USER_KEY, username);
}

export async function saveSessionFromBrowserCookies(cookies: BrowserCookie[]): Promise<string> {
  const sessionCookies = cookies.filter((cookie) => /instagram\.com$/i.test(cookie.domain ?? '.instagram.com'));

  if (sessionCookies.length === 0) {
    throw new Error('Aucun cookie Instagram valide reçu');
  }

  const client = new IgApiClient();
  client.state.generateDevice(DEVICE_SEED);
  await client.state.deserialize({ cookies: toSerializedCookieJar(sessionCookies) });
  await client.qe.syncLoginExperiments();

  const userCookie = sessionCookies.find((c) => c.name === 'ds_user');
  let username = userCookie?.value;

  if (!username) {
    // Fallback if the ds_user cookie is missing but sessionid is present
    const userIdCookie = sessionCookies.find((c) => c.name === 'ds_user_id');
    username = process.env.INSTAGRAM_TARGET_USERNAME || (userIdCookie ? `user_${userIdCookie.value}` : 'Utilisateur');
  }

  await persistClientSession(client, username);
  return username;
}

export async function loginAndSaveSession(username: string, password: string): Promise<string> {
  const client = new IgApiClient();
  client.state.generateDevice(username);

  await client.account.login(username, password);
  await persistClientSession(client, username);

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
  const client = await createClientFromStoredSession();

  const me = await client.account.currentUser();
  const pk = me.pk;

  const followersFeed = client.feed.accountFollowers(pk);
  const followingFeed = client.feed.accountFollowing(pk);

  const followers: string[] = [];
  const following: string[] = [];

  do {
    const page = await followersFeed.items();
    page.forEach((user) => followers.push(user.username));
  } while (followersFeed.isMoreAvailable());

  do {
    const page = await followingFeed.items();
    page.forEach((user) => following.push(user.username));
  } while (followingFeed.isMoreAvailable());

  return { followers, following };
}

export async function getFollowers(targetUsername: string): Promise<string[]> {
  const client = await createClientFromStoredSession();

  const targetUser = await client.user.searchExact(targetUsername);
  const followersFeed = client.feed.accountFollowers(targetUser.pk);

  const usernames: string[] = [];

  do {
    const page = await followersFeed.items();
    page.forEach((user) => usernames.push(user.username));
  } while (followersFeed.isMoreAvailable());

  return usernames;
}
