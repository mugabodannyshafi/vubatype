import { jwtMaxAgeMs } from './auth-cookie';

describe('jwtMaxAgeMs', () => {
  it('converts day, hour, and second lifetimes', () => {
    expect(jwtMaxAgeMs('1d')).toBe(24 * 60 * 60 * 1000);
    expect(jwtMaxAgeMs('12h')).toBe(12 * 60 * 60 * 1000);
    expect(jwtMaxAgeMs(60)).toBe(60 * 1000);
  });

  it('falls back to one day for an unknown value', () => {
    expect(jwtMaxAgeMs('later')).toBe(24 * 60 * 60 * 1000);
  });
});
