/**
 * STEP 5: Redis configuration.
 * REDIS_URL (single string) or REDIS_HOST + REDIS_PORT + REDIS_PASSWORD.
 */

export function getRedisOptions(): { url?: string; host?: string; port?: number; password?: string } {
  const url = (process.env.REDIS_URL ?? '').trim();
  if (url) return { url };
  const host = (process.env.REDIS_HOST ?? 'localhost').trim();
  const port = Math.max(1, parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379);
  const password = (process.env.REDIS_PASSWORD ?? '').trim() || undefined;
  return { host, port, password };
}

export function isRedisEnabled(): boolean {
  const url = (process.env.REDIS_URL ?? '').trim();
  if (url) return true;
  const host = (process.env.REDIS_HOST ?? '').trim();
  return host !== '' && host !== '0';
}
