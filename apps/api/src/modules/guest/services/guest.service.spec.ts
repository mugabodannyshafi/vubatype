/// <reference types="jest" />

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}));

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  InjectEntityManager: () => () => undefined,
}));

import { createHash } from 'crypto';
import { GuestSession } from '../../../database/entities/guest-session.entity';
import { GuestService } from './guest.service';

describe('GuestService', () => {
  let service: GuestService;

  const relationBuilder = {
    of: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockGuestRepository = {
    findOne: jest.fn(),
    create: jest.fn((entityOrData, maybeData) => maybeData ?? entityOrData),
    save: jest.fn(async (entity) => ({
      ...entity,
      id: entity.id ?? '1',
      created_at: entity.created_at ?? new Date('2026-01-01T00:00:00.000Z'),
    })),
    createQueryBuilder: jest.fn(() => ({
      relation: jest.fn(() => relationBuilder),
    })),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'GUEST_SESSION_TTL_DAYS') {
        return '7';
      }
      return defaultValue;
    }),
  };

  const existingSession = {
    id: '9',
    nickname: 'Old Name',
    session_token_hash: 'stored-hash',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    expires_at: new Date(Date.now() + 60_000),
    last_seen_at: null,
  };

  beforeEach(() => {
    service = new GuestService(mockGuestRepository as never, mockConfigService as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrRestore', () => {
    it('stores a hash and does not persist the raw token', async () => {
      mockGuestRepository.findOne.mockResolvedValue(null);

      const result = await service.createOrRestore('Swift Fox');
      const saved = mockGuestRepository.save.mock.calls[0][0];
      const expectedHash = createHash('sha256').update(result.token).digest('hex');

      expect(mockGuestRepository.create).toHaveBeenCalledTimes(1);
      expect(saved.session_token_hash).toBe(expectedHash);
      expect(saved.session_token_hash).not.toBe(result.token);
      expect(saved.nickname).toBe('Swift Fox');
      expect(result.created).toBe(true);
      expect(result.guest).not.toHaveProperty('session_token_hash');
      expect(result.guest.nickname).toBe('Swift Fox');
    });

    it('restores a valid session instead of creating another', async () => {
      mockGuestRepository.findOne.mockResolvedValue({ ...existingSession });

      const result = await service.createOrRestore('New Name', 'raw-token');

      expect(mockGuestRepository.create).not.toHaveBeenCalled();
      expect(mockGuestRepository.findOne).toHaveBeenCalledWith(
        GuestSession,
        expect.objectContaining({
          where: expect.objectContaining({
            session_token_hash: createHash('sha256').update('raw-token').digest('hex'),
          }),
        }),
      );
      expect(result.created).toBe(false);
      expect(result.token).toBeUndefined();
      expect(result.guest.id).toBe(Number(existingSession.id));
      expect(result.guest.nickname).toBe('New Name');
    });

    it('creates a new session when the existing token is expired or unknown', async () => {
      mockGuestRepository.findOne.mockResolvedValue(null);

      const result = await service.createOrRestore('Swift Fox', 'expired-token');

      expect(mockGuestRepository.create).toHaveBeenCalledTimes(1);
      expect(result.created).toBe(true);
      expect(result.token).toEqual(expect.any(String));
    });
  });

  describe('findValidByToken', () => {
    it('returns null for a missing token', async () => {
      const result = await service.findValidByToken();

      expect(result).toBeNull();
      expect(mockGuestRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no unexpired session matches', async () => {
      mockGuestRepository.findOne.mockResolvedValue(null);

      const result = await service.findValidByToken('missing-token');

      expect(result).toBeNull();
      expect(mockGuestRepository.save).not.toHaveBeenCalled();
    });

    it('updates last_seen_at for a valid session', async () => {
      mockGuestRepository.findOne.mockResolvedValue({ ...existingSession });

      const result = await service.findValidByToken('raw-token');

      expect(result.last_seen_at).toBeInstanceOf(Date);
      expect(mockGuestRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateNickname', () => {
    it('updates the nickname of the current session', async () => {
      const session = { ...existingSession };

      const result = await service.updateNickname(session as GuestSession, 'Quick Lynx');

      expect(mockGuestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: 'Quick Lynx' }),
      );
      expect(result.nickname).toBe('Quick Lynx');
      expect(result).not.toHaveProperty('session_token_hash');
    });
  });

  describe('linkToUser', () => {
    it('links an unclaimed guest without copying results', async () => {
      mockGuestRepository.findOne.mockResolvedValue({ id: '9', user: null });

      await service.linkToUser('9', 'user-1');

      expect(mockGuestRepository.findOne).toHaveBeenCalledWith(GuestSession, {
        where: { id: '9' },
        relations: { user: true },
      });
      expect(relationBuilder.of).toHaveBeenCalledWith('9');
      expect(relationBuilder.set).toHaveBeenCalledWith('user-1');
      expect(mockGuestRepository.save).not.toHaveBeenCalled();
      expect(mockGuestRepository.create).not.toHaveBeenCalled();
    });

    it('does nothing when the guest is already linked to that user', async () => {
      mockGuestRepository.findOne.mockResolvedValue({ id: '9', user: { id: 'user-1' } });

      await service.linkToUser('9', 'user-1');

      expect(mockGuestRepository.save).not.toHaveBeenCalled();
    });

    it('does not move a guest that belongs to someone else', async () => {
      mockGuestRepository.findOne.mockResolvedValue({ id: '9', user: { id: 'user-2' } });

      await service.linkToUser('9', 'user-1');

      expect(mockGuestRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('endSession', () => {
    it('expires the session without deleting the row', async () => {
      const session = { ...existingSession, expires_at: new Date(Date.now() + 60_000) };

      await service.endSession(session as GuestSession);

      expect(mockGuestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingSession.id,
          expires_at: expect.any(Date),
        }),
      );
      expect(session.expires_at.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
