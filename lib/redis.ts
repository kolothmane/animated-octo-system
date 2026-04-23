import { Redis } from '@upstash/redis';
import { getRedisConfig } from './env';

const { url, token } = getRedisConfig();

const redis = new Redis({
  url,
  token,
});

export default redis;
