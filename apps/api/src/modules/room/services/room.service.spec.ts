/// <reference types="jest" />

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { MatchStatus } from 'src/common/enums/MatchStatus';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { Match } from 'src/database/entities/match.entity';
import { RoomPlayer } from 'src/database/entities/room-player.entity';
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

  const mockRoomPlayerRepository = {
    create: jest.fn((data: object) => ({ ...data })),
    save: jest.fn(async (entity: { id?: string }) => ({ ...entity, id: entity.id ?? '70' })),
    update: jest.fn(),
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
      mockRoomPlayerRepository as never,
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

      const savedRoom = mockManager.save.mock.calls[0][0] as Room;
      const savedPlayer = mockManager.save.mock.calls[1][0] as RoomPlayer;
      expect(savedRoom.status).toBe(RoomStatus.WAITING);
      expect(savedRoom.duration_seconds).toBe(30);
      expect(savedRoom.difficulty).toBe(WordDifficulty.EASY);
      expect(savedRoom.max_players).toBe(8);
      expect(savedRoom.code).toHaveLength(ROOM_CODE_LENGTH);
      expect(savedRoom.code.split('').every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(
        true,
      );
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
        host: { id: 4, nickname: 'Quiet Lynx', avatar_url: null },
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
            guest: { id: 4, nickname: 'Quiet Lynx', avatar_url: null },
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
        relations: {
          host_guest: { avatar: true, user: true },
          language: true,
          players: { guest: { avatar: true, user: true } },
        },
      });
      expect(mockRoomRepository.update).not.toHaveBeenCalled();
      expect(result.players.map((player) => player.id)).toEqual([55, 56]);
      expect(result.players[0].is_host).toBe(true);
      expect(result.players[1].is_host).toBe(false);
      expect(result.host).toEqual({ id: 4, nickname: 'Quiet Lynx', avatar_url: null });
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

  describe('membership', () => {
    const createdAt = new Date('2026-10-21T00:41:00.000Z');
    const expiresAt = new Date(Date.now() + 60_000);
    const rival = { id: '8', nickname: 'Swift Fox' } as GuestSession;

    const waitingRoom = (players: RoomPlayer[], maxPlayers = 8): Room =>
      ({
        id: '101',
        code: 'AB7K2QMN',
        status: RoomStatus.WAITING,
        duration_seconds: 30,
        difficulty: WordDifficulty.EASY,
        max_players: maxPlayers,
        created_at: createdAt,
        expires_at: expiresAt,
        host_guest: { id: '4', nickname: 'Quiet Lynx' },
        language: { id: '1', code: 'rw', name: 'Kinyarwanda' },
        players,
      }) as Room;

    const member = (
      id: string,
      guestId: string,
      nickname: string,
      joinedAt: Date,
      extra: Partial<RoomPlayer> = {},
    ): RoomPlayer =>
      ({
        id,
        is_ready: false,
        joined_at: joinedAt,
        left_at: null,
        guest: { id: guestId, nickname },
        ...extra,
      }) as RoomPlayer;

    it('joins a new guest when the room has space', async () => {
      const hostJoined = new Date('2026-10-21T00:41:00.000Z');
      const open = waitingRoom([member('55', '4', 'Quiet Lynx', hostJoined)]);
      const joined = waitingRoom([
        member('55', '4', 'Quiet Lynx', hostJoined),
        member('70', '8', 'Swift Fox', hostJoined),
      ]);
      mockRoomRepository.findOne.mockResolvedValueOnce(open).mockResolvedValueOnce(joined);

      const result = await service.join(rival, 'ab7k2qmn');

      expect(mockRoomPlayerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          room: { id: '101' },
          guest: { id: '8' },
          is_ready: false,
        }),
      );
      expect(result.players.map((player) => player.guest.id)).toEqual([4, 8]);
    });

    it('rejoins a player who left instead of inserting another row', async () => {
      const hostJoined = new Date('2026-10-21T00:41:00.000Z');
      const away = waitingRoom([
        member('55', '4', 'Quiet Lynx', hostJoined),
        member('70', '8', 'Swift Fox', hostJoined, { left_at: new Date(), is_ready: true }),
      ]);
      const back = waitingRoom([
        member('55', '4', 'Quiet Lynx', hostJoined),
        member('70', '8', 'Swift Fox', hostJoined),
      ]);
      mockRoomRepository.findOne.mockResolvedValueOnce(away).mockResolvedValueOnce(back);

      await service.join(rival, 'AB7K2QMN');

      expect(mockRoomPlayerRepository.save).not.toHaveBeenCalled();
      expect(mockRoomPlayerRepository.update).toHaveBeenCalledWith('70', {
        left_at: null,
        is_ready: false,
      });
    });

    it('returns the current room when the guest is already inside', async () => {
      const hostJoined = new Date('2026-10-21T00:41:00.000Z');
      mockRoomRepository.findOne.mockResolvedValue(
        waitingRoom([member('55', '4', 'Quiet Lynx', hostJoined)]),
      );

      await service.join(guest, 'AB7K2QMN');

      expect(mockRoomPlayerRepository.save).not.toHaveBeenCalled();
      expect(mockRoomPlayerRepository.update).not.toHaveBeenCalled();
    });

    it('rejects a new player when the room is full', async () => {
      const hostJoined = new Date('2026-10-21T00:41:00.000Z');
      mockRoomRepository.findOne.mockResolvedValue(
        waitingRoom(
          [member('55', '4', 'Quiet Lynx', hostJoined), member('56', '9', 'Keza', hostJoined)],
          2,
        ),
      );

      await expect(service.join(rival, 'AB7K2QMN')).rejects.toThrow(
        new ConflictException('Room is full'),
      );
      expect(mockRoomPlayerRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a new player once the race has started', async () => {
      const racing = waitingRoom([member('55', '4', 'Quiet Lynx', createdAt)]);
      racing.status = RoomStatus.RACING;
      mockRoomRepository.findOne.mockResolvedValue(racing);

      await expect(service.join(rival, 'AB7K2QMN')).rejects.toThrow(
        new ConflictException('Room is not open for new players'),
      );
    });

    it('lets a current player leave and gives the room to the next player', async () => {
      const hostJoined = new Date('2026-10-21T00:41:00.000Z');
      const later = new Date('2026-10-21T00:42:00.000Z');
      const before = waitingRoom([
        member('55', '4', 'Quiet Lynx', hostJoined),
        member('56', '8', 'Swift Fox', later),
      ]);
      const after = waitingRoom([member('56', '8', 'Swift Fox', later)]);
      after.host_guest = { id: '8', nickname: 'Swift Fox' } as GuestSession;
      mockRoomRepository.findOne.mockResolvedValueOnce(before).mockResolvedValueOnce(after);

      const result = await service.leave(guest, 'AB7K2QMN');

      expect(mockRoomPlayerRepository.update).toHaveBeenCalledWith(
        '55',
        expect.objectContaining({ is_ready: false }),
      );
      expect(mockRoomRepository.update).toHaveBeenCalledWith('101', {
        host_guest: { id: '8' },
      });
      expect(result.host.id).toBe(8);
    });

    it('expires the room when the last player leaves', async () => {
      const before = waitingRoom([member('55', '4', 'Quiet Lynx', createdAt)]);
      const after = waitingRoom([]);
      after.status = RoomStatus.EXPIRED;
      mockRoomRepository.findOne.mockResolvedValueOnce(before).mockResolvedValueOnce(after);

      const result = await service.leave(guest, 'AB7K2QMN');

      expect(mockRoomRepository.update).toHaveBeenCalledWith('101', {
        status: RoomStatus.EXPIRED,
      });
      expect(result.status).toBe(RoomStatus.EXPIRED);
    });

    it('rejects leave after the race has started', async () => {
      const racing = waitingRoom([member('55', '4', 'Quiet Lynx', createdAt)]);
      racing.status = RoomStatus.RACING;
      mockRoomRepository.findOne.mockResolvedValue(racing);

      await expect(service.leave(guest, 'AB7K2QMN')).rejects.toThrow(
        new ConflictException('You can only leave before the race begins'),
      );
    });

    it('rejects leave from someone who is not in the room', async () => {
      mockRoomRepository.findOne.mockResolvedValue(
        waitingRoom([member('55', '4', 'Quiet Lynx', createdAt)]),
      );

      await expect(service.leave(rival, 'AB7K2QMN')).rejects.toThrow(ForbiddenException);
    });

    it('marks a lobby player ready', async () => {
      const before = waitingRoom([member('55', '4', 'Quiet Lynx', createdAt)]);
      const after = waitingRoom([member('55', '4', 'Quiet Lynx', createdAt, { is_ready: true })]);
      mockRoomRepository.findOne.mockResolvedValueOnce(before).mockResolvedValueOnce(after);

      const result = await service.setReady(guest, 'AB7K2QMN', true);

      expect(mockRoomPlayerRepository.update).toHaveBeenCalledWith('55', { is_ready: true });
      expect(result.players[0].is_ready).toBe(true);
    });

    it('rejects ready changes outside the lobby', async () => {
      const racing = waitingRoom([member('55', '4', 'Quiet Lynx', createdAt)]);
      racing.status = RoomStatus.RACING;
      mockRoomRepository.findOne.mockResolvedValue(racing);

      await expect(service.setReady(guest, 'AB7K2QMN', true)).rejects.toThrow(
        new ConflictException('Ready status can only change in the lobby'),
      );
    });

    it('transfers the host to the earliest connected player', async () => {
      const hostJoined = new Date('2026-10-21T00:41:00.000Z');
      const later = new Date('2026-10-21T00:43:00.000Z');
      const middle = new Date('2026-10-21T00:42:00.000Z');
      const before = waitingRoom([
        member('57', '9', 'Keza', later),
        member('56', '8', 'Swift Fox', middle),
        member('55', '4', 'Quiet Lynx', hostJoined),
      ]);
      const after = waitingRoom([
        member('56', '8', 'Swift Fox', middle),
        member('57', '9', 'Keza', later),
        member('55', '4', 'Quiet Lynx', hostJoined),
      ]);
      after.host_guest = { id: '8', nickname: 'Swift Fox' } as GuestSession;
      mockRoomRepository.findOne.mockResolvedValueOnce(before).mockResolvedValueOnce(after);

      const result = await service.transferHost('AB7K2QMN', ['9', '8']);

      expect(mockRoomRepository.update).toHaveBeenCalledWith('101', {
        host_guest: { id: '8' },
      });
      expect(result.host.id).toBe(8);
    });

    it('keeps the host when they are still connected', async () => {
      mockRoomRepository.findOne.mockResolvedValue(
        waitingRoom([
          member('55', '4', 'Quiet Lynx', createdAt),
          member('56', '8', 'Swift Fox', createdAt),
        ]),
      );

      await service.transferHost('AB7K2QMN', ['4', '8']);

      expect(mockRoomRepository.update).not.toHaveBeenCalled();
    });

    it('requires the host, two connected players, and ready status before a start', () => {
      const room = waitingRoom([
        member('55', '4', 'Quiet Lynx', createdAt, { is_ready: true }),
        member('56', '8', 'Swift Fox', createdAt, { is_ready: false }),
      ]);

      expect(() => service.assertCanStart(rival, room, ['4', '8'])).toThrow(ForbiddenException);
      expect(() => service.assertCanStart(guest, room, ['4'])).toThrow(
        new ConflictException('At least two players must be connected'),
      );
      expect(() => service.assertCanStart(guest, room, ['4', '8'])).toThrow(
        new ConflictException('Every player must be ready'),
      );

      const rivalPlayer = room.players?.find((player) => player.id === '56');
      if (rivalPlayer) {
        rivalPlayer.is_ready = true;
      }
      expect(service.assertCanStart(guest, room, ['4', '8']).map((player) => player.id)).toEqual([
        '55',
        '56',
      ]);

      const view = {
        id: 101,
        code: 'AB7K2QMN',
        status: RoomStatus.WAITING,
        host: { id: 4, nickname: 'Quiet Lynx', avatar_url: null },
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
            is_ready: true,
            joined_at: null,
            guest: { id: 4, nickname: 'Quiet Lynx', avatar_url: null },
          },
          {
            id: 56,
            is_host: false,
            is_ready: true,
            joined_at: null,
            guest: { id: 8, nickname: 'Swift Fox', avatar_url: null },
          },
        ],
        created_at: null,
        expires_at: null,
      };
      expect(service.canStart(view, ['4', '8'], '4')).toBe(true);
      expect(service.canStart(view, ['4'], '4')).toBe(false);
      expect(service.canStart(view, ['4', '8'], '8')).toBe(false);
    });
  });
});
