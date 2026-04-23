import { Redis } from '@upstash/redis';
import { getRedisConfig } from './env';

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const { url, token } = getRedisConfig();
    _redis = new Redis({ url, token });
  }
  return _redis;
}

const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return getRedis()[prop as keyof Redis];
  },
});

export default redis;
