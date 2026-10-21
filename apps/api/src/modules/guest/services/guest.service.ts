import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { EntityManager, MoreThan } from 'typeorm';
import { GuestSession } from '../../../database/entities/guest-session.entity';
import { DateTime } from 'luxon';

export const DEFAULT_GUEST_SESSION_TTL_DAYS = 7;

export interface GuestProfile {
  id: number;
  nickname: string;
  created_at: string | null;
  expires_at: string | null;
  last_seen_at: string | null;
}

export interface GuestSessionResult {
  guest: GuestProfile;
  created: boolean;
  token?: string;
}

@Injectable()
export class GuestService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
  ) {}

  async createOrRestore(nickname: string, rawToken?: string): Promise<GuestSessionResult> {
    if (rawToken) {
      const existing = await this.findValidByToken(rawToken);
      if (existing) {
        existing.nickname = nickname;
        const saved = await this.entityManager.save(existing);
        return { guest: this.toProfile(saved), created: false };
      }
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const session = this.entityManager.create(GuestSession, {
      nickname,
      session_token_hash: this.hashToken(token),
      expires_at: this.expiryFrom(now),
      last_seen_at: now,
    });
    const saved = await this.entityManager.save(session);

    return { guest: this.toProfile(saved), created: true, token };
  }

  async findValidByToken(rawToken?: string): Promise<GuestSession | null> {
    if (!rawToken) {
      return null;
    }

    const session = await this.entityManager.findOne(GuestSession, {
      where: {
        session_token_hash: this.hashToken(rawToken),
        expires_at: MoreThan(new Date()),
      },
    });

    if (!session) {
      return null;
    }

    session.last_seen_at = new Date();
    return this.entityManager.save(session);
  }

  async updateNickname(session: GuestSession, nickname: string): Promise<GuestProfile> {
    session.nickname = nickname;
    const saved = await this.entityManager.save(session);
    return this.toProfile(saved);
  }

  async endSession(session: GuestSession): Promise<void> {
    session.expires_at = new Date();
    await this.entityManager.save(session);
  }

  toProfile(session: GuestSession): GuestProfile {
    return {
      id: Number(session.id),
      nickname: session.nickname,
      created_at: session.created_at
        ? DateTime.fromJSDate(session.created_at).toFormat('yyyy-MM-dd HH:mm:ss')
        : null,
      expires_at: session.expires_at
        ? DateTime.fromJSDate(session.expires_at).toFormat('yyyy-MM-dd HH:mm:ss')
        : null,
      last_seen_at: session.last_seen_at
        ? DateTime.fromJSDate(session.last_seen_at).toFormat('yyyy-MM-dd HH:mm:ss')
        : null,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private expiryFrom(from: Date): Date {
    const configured = Number(
      this.configService.get<string>(
        'GUEST_SESSION_TTL_DAYS',
        String(DEFAULT_GUEST_SESSION_TTL_DAYS),
      ),
    );
    const ttlDays =
      Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_GUEST_SESSION_TTL_DAYS;

    return new Date(from.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  }
}
