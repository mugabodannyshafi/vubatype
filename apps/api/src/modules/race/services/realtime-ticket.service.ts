import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export const REALTIME_TICKET_TTL_MS = 5 * 60 * 1000;

export interface RealtimeTicket {
  token: string;
  expires_at: string;
}

@Injectable()
export class RealtimeTicketService {
  constructor(private readonly configService: ConfigService) {}

  issue(guestId: string): RealtimeTicket {
    const expiresAt = Date.now() + REALTIME_TICKET_TTL_MS;
    const payload = Buffer.from(JSON.stringify({ sub: String(guestId), exp: expiresAt })).toString(
      'base64url',
    );
    const signature = this.sign(payload);
    return {
      token: `${payload}.${signature}`,
      expires_at: new Date(expiresAt).toISOString(),
    };
  }

  verify(token: string): string {
    const [payload, signature] = token.split('.');
    if (!payload || !signature || token.split('.').length !== 2) {
      throw new UnauthorizedException('Realtime ticket is invalid');
    }

    const expected = this.sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Realtime ticket is invalid');
    }

    let parsed: { sub?: unknown; exp?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        sub?: unknown;
        exp?: unknown;
      };
    } catch {
      throw new UnauthorizedException('Realtime ticket is invalid');
    }

    if (typeof parsed.sub !== 'string' || !parsed.sub) {
      throw new UnauthorizedException('Realtime ticket is invalid');
    }
    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      throw new UnauthorizedException('Realtime ticket has expired');
    }

    return parsed.sub;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret()).update(payload).digest('base64url');
  }

  private secret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Realtime tickets are not configured');
    }
    return secret;
  }
}
