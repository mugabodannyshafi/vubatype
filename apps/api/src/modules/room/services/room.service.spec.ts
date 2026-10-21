/// <reference types="jest" />

import { ConflictException, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { MatchStatus } from 'src/common/enums/MatchStatus';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { Match } from 'src/database/entities/match.entity';
import { Room } from 'src/database/entities/room.entity';
import { CreateRoomDto } from '../dto/create-room.dto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_TTL_MS, RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;

  const mockRoomRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockMatchRepository = {
    findAndCount: jest.fn(),
  };

  const mockManager = {
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (entity: { code?: string; id?: string }) => ({
      ...entity,
      id: entity.id ?? (entity.code ? '101' : '55'),
    })),
  };

  const mockEntityManager = {
    transaction: jest.fn(async (work: (manager: typeof mockManager) => Promise<Room>) =>
      work(mockManager),
    ),
  };

  const mockLanguageService = {
    findAvailableByCode: jest.fn(),
  };

  const guest = {
    id: '4',
    nickname: 'Quiet Lynx',
    session_token_hash: 'secret-hash',
  } as GuestSession;

  const dto: CreateRoomDto = {
    language_code: 'rw',
    difficulty: WordDifficulty.EASY,
    duration_seconds: 30,
    max_players: 8,
  };

  const codeCollision = {
    driverError: {
      code: '23505',
      table: 'rooms',
      constraint: 'UQ_rooms_code',
      detail: 'Key (code)=(AB7K2QMN) already exists.',
    },
  };

  const membershipCollision = {
    driverError: {
      code: '23505',
      table: 'room_players',
      constraint: 'UQ_room_players_room_guest',
      detail: 'Key (room_id, guest_id)=(101, 4) already exists.',
    },
  };

  const timestamp = (value: Date) => DateTime.fromJSDate(value).toFormat('yyyy-MM-dd HH:mm:ss');

  beforeEach(() => {
    service = new RoomService(
      mockRoomRepository as never,
      mockMatchRepository as never,
      mockEntityManager as never,
      mockLanguageService as never,
    );
    mockLanguageService.findAvailableByCode.mockResolvedValue({
      id: 1,
      code: 'rw',
      name: 'Kinyarwanda',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a waiting room and host membership in one transaction', async () => {
      const result = await service.create(guest, dto);

      expect(mockLanguageService.findAvailableByCode).toHaveBeenCalledWith('rw');
      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalledTimes(2);

      const savedRoom = mockManager.save.mock.calls[0][0];
      const savedPlayer = mockManager.save.mock.calls[1][0];
      expect(savedRoom.status).toBe(RoomStatus.WAITING);
      expect(savedRoom.duration_seconds).toBe(30);
      expect(savedRoom.difficulty).toBe(WordDifficulty.EASY);
      expect(savedRoom.max_players).toBe(8);
      expect(savedRoom.code).toHaveLength(ROOM_CODE_LENGTH);
      expect(savedRoom.code.split('').every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(true);
      expect(savedRoom.expires_at.getTime() - savedRoom.created_at.getTime()).toBe(ROOM_TTL_MS);
      expect(savedRoom.host_guest).toEqual({ id: guest.id });
      expect(savedRoom.language).toEqual({ id: '1' });
      expect(savedPlayer.guest).toEqual({ id: guest.id });
      expect(savedPlayer.is_ready).toBe(false);
      expect(savedPlayer.room).toEqual({ id: '101' });

      expect(result).toEqual({
        id: 101,
        code: savedRoom.code,
        status: RoomStatus.WAITING,
        host: { id: 4, nickname: 'Quiet Lynx' },
        settings: {
          language: { id: 1, code: 'rw', name: 'Kinyarwanda' },
          difficulty: WordDifficulty.EASY,
          duration_seconds: 30,
          max_players: 8,
        },
        players: [
          {
            id: 55,
            is_host: true,
            is_ready: false,
            joined_at: timestamp(savedRoom.created_at),
            guest: { id: 4, nickname: 'Quiet Lynx' },
          },
        ],
        created_at: timestamp(savedRoom.created_at),
        expires_at: timestamp(savedRoom.expires_at),
      });
      expect(JSON.stringify(result)).not.toContain('secret-hash');
    });

    it('retries when the room code is already taken', async () => {
      mockEntityManager.transaction
        .mockRejectedValueOnce(codeCollision)
        .mockImplementationOnce(async (work) => work(mockManager));

      const result = await service.create(guest, dto);

      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(RoomStatus.WAITING);
      expect(result.code).toHaveLength(ROOM_CODE_LENGTH);
    });

    it('rejects when a unique room code cannot be allocated', async () => {
      mockEntityManager.transaction.mockRejectedValue(codeCollision);

      await expect(service.create(guest, dto)).rejects.toThrow(
        new ConflictException('Could not allocate a unique room code'),
      );
      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(5);
    });

    it('rejects duplicate room membership', async () => {
      mockEntityManager.transaction.mockRejectedValue(membershipCollision);

      await expect(service.create(guest, dto)).rejects.toThrow(
        new ConflictException('Guest is already in this room'),
      );
      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
    });

    it('does not open a transaction when the language is unavailable', async () => {
      mockLanguageService.findAvailableByCode.mockRejectedValue(
        new NotFoundException('Language with code "rw" not found'),
      );

      await expect(service.create(guest, dto)).rejects.toThrow(NotFoundException);
      expect(mockEntityManager.transaction).not.toHaveBeenCalled();
    });

    it('rethrows unexpected database errors', async () => {
      mockEntityManager.transaction.mockRejectedValue(new Error('connection lost'));

      await expect(service.create(guest, dto)).rejects.toThrow('connection lost');
      expect(mockEntityManager.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByCode', () => {
    const joinedAt = new Date('2026-10-21T00:41:00.000Z');
    const laterJoinedAt = new Date('2026-10-21T00:42:00.000Z');
    const createdAt = new Date('2026-10-21T00:41:00.000Z');
    const expiresAt = new Date(Date.now() + 60_000);

    const room = (): Room =>
      ({
        id: '101',
        code: 'AB7K2QMN',
        status: RoomStatus.WAITING,
        duration_seconds: 30,
        difficulty: WordDifficulty.EASY,
        max_players: 8,
        created_at: createdAt,
        expires_at: expiresAt,
        host_guest: { id: '4', nickname: 'Quiet Lynx', session_token_hash: 'secret-hash' },
        language: { id: '1', code: 'rw', name: 'Kinyarwanda' },
        players: [
          {
            id: '56',
            is_ready: false,
            joined_at: laterJoinedAt,
            left_at: null,
            guest: { id: '8', nickname: 'Swift Fox' },
          },
          {
            id: '55',
            is_ready: false,
            joined_at: joinedAt,
            left_at: null,
            guest: { id: '4', nickname: 'Quiet Lynx', session_token_hash: 'secret-hash' },
          },
          {
            id: '57',
            is_ready: true,
            joined_at: joinedAt,
            left_at: new Date(),
            guest: { id: '9', nickname: 'Left Player' },
          },
        ],
      }) as Room;

    it('returns the host, settings, and players who have not left', async () => {
      mockRoomRepository.findOne.mockResolvedValue(room());

      const result = await service.getByCode('ab7k2qmn');

      expect(mockRoomRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'AB7K2QMN' },
        relations: { host_guest: true, language: true, players: { guest: true } },
      });
      expect(mockRoomRepository.update).not.toHaveBeenCalled();
      expect(result.players.map((player) => player.id)).toEqual([55, 56]);
      expect(result.players[0].is_host).toBe(true);
      expect(result.players[1].is_host).toBe(false);
      expect(result.host).toEqual({ id: 4, nickname: 'Quiet Lynx' });
      expect(result.settings.language).toEqual({ id: 1, code: 'rw', name: 'Kinyarwanda' });
      expect(JSON.stringify(result)).not.toContain('secret-hash');
    });

    it('marks a waiting room expired when its expiry is in the past', async () => {
      const expiredRoom = room();
      expiredRoom.expires_at = new Date(Date.now() - 1000);
      mockRoomRepository.findOne.mockResolvedValue(expiredRoom);

      const result = await service.getByCode('AB7K2QMN');

      expect(mockRoomRepository.update).toHaveBeenCalledWith('101', {
        status: RoomStatus.EXPIRED,
      });
      expect(result.status).toBe(RoomStatus.EXPIRED);
    });

    it('does not expire a room that is already racing', async () => {
      const racingRoom = room();
      racingRoom.status = RoomStatus.RACING;
      racingRoom.expires_at = new Date(Date.now() - 1000);
      mockRoomRepository.findOne.mockResolvedValue(racingRoom);

      const result = await service.getByCode('AB7K2QMN');

      expect(mockRoomRepository.update).not.toHaveBeenCalled();
      expect(result.status).toBe(RoomStatus.RACING);
    });

    it('rejects a malformed room code', async () => {
      await expect(service.getByCode('NOPE')).rejects.toThrow(
        new NotFoundException('Room not found'),
      );
      expect(mockRoomRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects an unknown room code', async () => {
      mockRoomRepository.findOne.mockResolvedValue(null);

      await expect(service.getByCode('AB7K2QMN')).rejects.toThrow(
        new NotFoundException('Room not found'),
      );
    });
  });

  describe('listMatches', () => {
    const createdAt = new Date('2026-10-21T01:00:00.000Z');
    const startsAt = new Date('2026-10-21T01:00:05.000Z');

    beforeEach(() => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: '101',
        code: 'AB7K2QMN',
        status: RoomStatus.WAITING,
        expires_at: new Date(Date.now() + 60_000),
      });
    });

    it('returns matches newest first using pagination', async () => {
      const match = {
        id: '9',
        status: MatchStatus.COMPLETED,
        duration_seconds: 30,
        created_at: createdAt,
        starts_at: startsAt,
        ends_at: null,
        completed_at: null,
      } as Match;
      mockMatchRepository.findAndCount.mockResolvedValue([[match], 1]);

      const result = await service.listMatches('AB7K2QMN', { page: 2, limit: 10 });

      expect(mockRoomRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'AB7K2QMN' },
        relations: undefined,
      });
      expect(mockMatchRepository.findAndCount).toHaveBeenCalledWith({
        where: { room: { id: '101' } },
        order: { created_at: 'DESC', id: 'DESC' },
        skip: 10,
        take: 10,
      });
      expect(result.items).toEqual([
        {
          id: 9,
          status: MatchStatus.COMPLETED,
          duration_seconds: 30,
          created_at: timestamp(createdAt),
          starts_at: timestamp(startsAt),
          ends_at: null,
          completed_at: null,
        },
      ]);
      expect(result.currentPage).toBe(2);
      expect(result.itemsPerPage).toBe(10);
      expect(result.total).toBe(1);
      expect(result.pageItems).toBe(1);
    });

    it('uses the default page and limit', async () => {
      mockMatchRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.listMatches('AB7K2QMN', {});

      expect(mockMatchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.currentPage).toBe(1);
      expect(result.itemsPerPage).toBe(20);
      expect(result.lastPage).toBe(0);
    });

    it('still lists matches after a waiting room expires', async () => {
      mockRoomRepository.findOne.mockResolvedValue({
        id: '101',
        code: 'AB7K2QMN',
        status: RoomStatus.WAITING,
        expires_at: new Date(Date.now() - 1000),
      });
      mockMatchRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.listMatches('AB7K2QMN', {});

      expect(mockRoomRepository.update).toHaveBeenCalledWith('101', {
        status: RoomStatus.EXPIRED,
      });
      expect(mockMatchRepository.findAndCount).toHaveBeenCalled();
    });

    it('rejects an unknown room before querying matches', async () => {
      mockRoomRepository.findOne.mockResolvedValue(null);

      await expect(service.listMatches('AB7K2QMN', {})).rejects.toThrow(NotFoundException);
      expect(mockMatchRepository.findAndCount).not.toHaveBeenCalled();
    });
  });
});
