function firstNonEmpty(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function getBaseUrl(): string {
  return (
    firstNonEmpty(process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL) ||
    'http://localhost:3000'
  );
}

export function getDefaultTargetUsername(): string {
  return process.env.INSTAGRAM_TARGET_USERNAME?.trim() || '';
}

export function getTelegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) return null;
  return { token, chatId };
}

export function getRedisConfig(): { url: string; token: string } {
  const url = firstNonEmpty(
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.KV_REST_API_URL,
    process.env.KV_URL,
    process.env.REDIS_URL
  );

  const token = firstNonEmpty(
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.KV_REST_API_TOKEN,
    process.env.KV_REST_API_READ_ONLY_TOKEN
  );

  if (!url) {
    throw new Error(
      'Missing Redis URL. Expected one of: UPSTASH_REDIS_REST_URL, KV_REST_API_URL, KV_URL, REDIS_URL'
    );
  }

  if (!token) {
    throw new Error(
      'Missing Redis token. Expected one of: UPSTASH_REDIS_REST_TOKEN, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN'
    );
  }

  return { url, token };
}
