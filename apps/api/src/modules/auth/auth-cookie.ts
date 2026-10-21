export const AUTH_COOKIE_NAME = 'auth_session';

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Cookie lifetime matching jsonwebtoken `expiresIn` (`7d`, `12h`, or seconds). */
export function jwtMaxAgeMs(expiresIn: unknown): number {
  const fallback = UNIT_MS.d;

  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
    return expiresIn * UNIT_MS.s;
  }

  if (typeof expiresIn !== 'string') {
    return fallback;
  }

  const trimmed = expiresIn.trim();
  const withUnit = /^(\d+)\s*([smhd])$/i.exec(trimmed);
  if (withUnit) {
    return Number(withUnit[1]) * UNIT_MS[withUnit[2].toLowerCase()];
  }

  const seconds = /^(\d+)$/.exec(trimmed);
  if (seconds) {
    return Number(seconds[1]) * UNIT_MS.s;
  }

  return fallback;
}
