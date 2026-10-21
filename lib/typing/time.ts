const SERVER_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export function parseServerTimestamp(value: string): number | null {
  const match = SERVER_TIMESTAMP.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timestamp = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveSessionClock(
  startedAt: string | null,
  expiresAt: string | null,
  durationSeconds: number,
  receivedAt: number,
): { startedAt: number; expiresAt: number } {
  const durationMs = durationSeconds * 1000;
  const parsedStart = startedAt ? parseServerTimestamp(startedAt) : null;
  const parsedExpiry = expiresAt ? parseServerTimestamp(expiresAt) : null;
  const start = parsedStart ?? receivedAt;
  const expiry = parsedExpiry ?? start + durationMs;
  const remaining = expiry - receivedAt;

  if (remaining < -1000 || remaining > durationMs + 2000) {
    return { startedAt: receivedAt, expiresAt: receivedAt + durationMs };
  }

  return { startedAt: start, expiresAt: expiry };
}
