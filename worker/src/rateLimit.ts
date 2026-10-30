/** Fixed-window counter in D1. Returns true when this hit is within the limit. */
export async function allowHit(db: D1Database, bucket: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
  const windowStart = now - (now % windowMs);
  const row = await db.prepare(
    'INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1) ' +
    'ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1 RETURNING count',
  ).bind(bucket, windowStart).first<{ count: number }>();
  return (row?.count ?? Infinity) <= limit;
}

export async function pruneRateLimits(db: D1Database, olderThan: number): Promise<void> {
  await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(olderThan).run();
}
