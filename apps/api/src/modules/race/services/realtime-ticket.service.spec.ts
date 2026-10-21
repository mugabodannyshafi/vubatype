/// <reference types="jest" />

import { UnauthorizedException } from '@nestjs/common';
import { RealtimeTicketService } from './realtime-ticket.service';

describe('RealtimeTicketService', () => {
  const service = new RealtimeTicketService({
    get: (key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined),
  } as never);

  it('issues a ticket that resolves to the same guest', () => {
    const ticket = service.issue('42');

    expect(service.verify(ticket.token)).toBe('42');
    expect(new Date(ticket.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a ticket that was tampered with', () => {
    const ticket = service.issue('42');
    const [payload] = ticket.token.split('.');

    expect(() => service.verify(`${payload}.not-the-signature`)).toThrow(UnauthorizedException);
  });

  it('rejects an expired ticket', () => {
    jest.useFakeTimers({ now: new Date('2026-10-21T12:00:00.000Z') });
    const ticket = service.issue('42');
    jest.setSystemTime(new Date('2026-10-21T12:06:00.000Z'));

    expect(() => service.verify(ticket.token)).toThrow(
      new UnauthorizedException('Realtime ticket has expired'),
    );
    jest.useRealTimers();
  });
});
