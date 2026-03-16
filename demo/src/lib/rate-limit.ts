const DAILY_LIMIT = 3;

// In-memory rate limit store. Resets on cold start (acceptable for demo).
const store = new Map<string, { count: number; date: string }>();

function getDateKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getKey(ip: string): string {
  // Simple hash of IP for privacy
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `rate:${getDateKey()}:${Math.abs(hash)}`;
}

export function getRemainingRuns(ip: string): number {
  const key = getKey(ip);
  const entry = store.get(key);
  if (!entry || entry.date !== getDateKey()) {
    return DAILY_LIMIT;
  }
  return Math.max(0, DAILY_LIMIT - entry.count);
}

export function incrementUsage(ip: string): number {
  const key = getKey(ip);
  const today = getDateKey();
  const entry = store.get(key);

  if (!entry || entry.date !== today) {
    store.set(key, { count: 1, date: today });
    return DAILY_LIMIT - 1;
  }

  entry.count += 1;
  store.set(key, entry);
  return Math.max(0, DAILY_LIMIT - entry.count);
}

export function isRateLimited(ip: string): boolean {
  return getRemainingRuns(ip) <= 0;
}
