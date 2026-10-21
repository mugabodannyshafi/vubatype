/// <reference types="jest" />

import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { MatchResultStatus } from 'src/common/enums/MatchResultStatus';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { MatchResult } from 'src/database/entities/match-result.entity';
import { Room } from 'src/database/entities/room.entity';
import { RoomPlayer } from 'src/database/entities/room-player.entity';
import { TypingScoreService } from 'src/modules/practice/services/typing-score.service';
import { RaceService } from './race.service';

describe('RaceService', () => {
  const host = { id: '4', nickname: 'Host' } as GuestSession;
  const rival = { id: '8', nickname: 'Rival' } as GuestSession;
  const stranger = { id: '3', nickname: 'Stranger' } as GuestSession;
  const code = 'AB7K2QMN';
  const passage = 'hello world';

  let nextId = 500;
  let service: RaceService;
  const emitted: Array<{ code: string; event: string; payload: unknown }> = [];

  const mockManager = {
    findOne: jest.fn(async () => ({ id: '101', status: RoomStatus.WAITING })),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (entity: { id?: string }) => ({
      ...entity,
      id: entity.id ?? String(++nextId),
    })),
    update: jest.fn(),
  };

  const mockMatchRepository = {
    update: jest.fn(),
    manager: {
      transaction: jest.fn(async (work: (manager: typeof mockManager) => Promise<unknown>) =>
        work(mockManager),
      ),
    },
  };

  const mockParticipantRepository = {
    update: jest.fn(),
  };

  const mockResultRepository = {
    create: jest.fn((data: object) => data),
    save: jest.fn(async (rows: MatchResult[]) => rows),
  };

  const mockRoomService = {
    loadByCode: jest.fn(),
    assertCanStart: jest.fn(),
    applyStatus: jest.fn(),
    resetLobby: jest.fn(),
  };

  const mockPassageGenerator = {
    generate: jest.fn(),
  };

  const room = {
    id: '101',
    code,
    status: RoomStatus.WAITING,
    duration_seconds: 30,
    difficulty: WordDifficulty.EASY,
    language: { id: '1' },
    host_guest: host,
  } as Room;

  const players = [
    { id: '55', guest: host, is_ready: true },
    { id: '56', guest: rival, is_ready: true },
  ] as RoomPlayer[];

  beforeEach(() => {
    nextId = 500;
    emitted.length = 0;
    service = new RaceService(
      mockRoomService as never,
      mockPassageGenerator as never,
      new TypingScoreService(),
      mockMatchRepository as never,
      mockParticipantRepository as never,
      mockResultRepository as never,
    );
    service.bindEmitter((roomCode, event, payload) => {
      emitted.push({ code: roomCode, event, payload });
    });
    mockRoomService.loadByCode.mockResolvedValue(room);
    mockRoomService.assertCanStart.mockReturnValue(players);
    mockPassageGenerator.generate.mockResolvedValue({ id: '9', content: passage });
    jest.useFakeTimers({ now: new Date('2026-10-21T12:00:00.000Z') });
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  async function startRace(): Promise<void> {
    await service.start(host, code, ['4', '8']);
    await jest.advanceTimersByTimeAsync(3_000);
  }

  it('does not create a match when the host is not allowed to start', async () => {
    mockRoomService.assertCanStart.mockImplementation(() => {
      throw new ForbiddenException('Only the host can start the race');
    });

    await expect(service.start(rival, code, ['4', '8'])).rejects.toThrow(ForbiddenException);
    expect(mockPassageGenerator.generate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('does not create a match when fewer than two players are connected', async () => {
    mockRoomService.assertCanStart.mockImplementation(() => {
      throw new ConflictException('At least two players must be connected');
    });

    await expect(service.start(host, code, ['4'])).rejects.toThrow(ConflictException);
    expect(mockPassageGenerator.generate).not.toHaveBeenCalled();
  });

  it('counts down on the server and then opens the same passage', async () => {
    await service.start(host, 'ab7k2qmn', ['4', '8']);

    expect(mockPassageGenerator.generate).toHaveBeenCalledWith({
      languageId: '1',
      difficulty: WordDifficulty.EASY,
      durationSeconds: 30,
      source: 'race',
    });
    expect(emitted.map((event) => event.event)).toEqual(['race:countdown']);
    expect(emitted[0].payload).toEqual(expect.objectContaining({ passage, duration_seconds: 30 }));
    expect(mockRoomService.applyStatus).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(3_000);

    expect(mockRoomService.applyStatus).toHaveBeenCalledWith('101', RoomStatus.RACING);
    expect(emitted.map((event) => event.event)).toEqual(['race:countdown', 'race:started']);
  });

  it('rejects progress before the countdown ends, from outsiders, and when it is not plausible', async () => {
    await service.start(host, code, ['4', '8']);

    await expect(service.progress(host, code, 'h')).rejects.toThrow(
      new ConflictException('Race has not started'),
    );

    await jest.advanceTimersByTimeAsync(3_000);

    await expect(service.progress(stranger, code, 'h')).rejects.toThrow(ForbiddenException);
    await expect(service.progress(host, code, passage)).rejects.toThrow(BadRequestException);
    await expect(service.progress(host, code, 'x'.repeat(passage.length + 51))).rejects.toThrow(
      new BadRequestException('Progress update is too long'),
    );
    expect(mockResultRepository.save).not.toHaveBeenCalled();
  });

  it('accepts a shorter text after a backspace and ranks finishers by completion time', async () => {
    await startRace();
    await jest.advanceTimersByTimeAsync(1_000);
    await service.progress(host, code, 'he');
    await service.progress(host, code, 'h');

    const standings = emitted.filter((event) => event.event === 'race:standings');
    const latest = standings[standings.length - 1].payload as {
      racers: Array<{ guest_id: number; progress: number }>;
    };
    expect(latest.racers.find((racer) => racer.guest_id === 4)?.progress).toBeCloseTo(
      (1 / passage.length) * 100,
      2,
    );

    await service.progress(host, code, passage);
    await jest.advanceTimersByTimeAsync(500);
    await service.progress(rival, code, passage);

    expect(emitted.some((event) => event.event === 'race:finished')).toBe(true);
    const finished = emitted.find((event) => event.event === 'race:finished')?.payload as {
      racers: Array<{ guest_id: number; rank: number; finished: boolean }>;
    };
    expect(finished.racers.map((racer) => [racer.guest_id, racer.rank, racer.finished])).toEqual([
      [4, 1, true],
      [8, 2, true],
    ]);
    expect(mockRoomService.applyStatus).toHaveBeenCalledWith('101', RoomStatus.FINISHED);
  });

  it('finishes unfinished racers when the time limit expires and ranks them by progress', async () => {
    await startRace();
    await jest.advanceTimersByTimeAsync(1_000);
    await service.progress(host, code, 'hello');
    await jest.advanceTimersByTimeAsync(29_000);

    const saved = mockResultRepository.save.mock.calls[0][0] as MatchResult[];
    expect(saved.map((result) => [result.guest, result.rank_position, result.status])).toEqual([
      [{ id: '4' }, 1, MatchResultStatus.UNFINISHED],
      [{ id: '8' }, 2, MatchResultStatus.UNFINISHED],
    ]);
    expect(Number(saved[0].final_progress)).toBeGreaterThan(Number(saved[1].final_progress));
    expect(saved[0].is_finished).toBe(false);
    expect(emitted.some((event) => event.event === 'race:finished')).toBe(true);
  });
});
