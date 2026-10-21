import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchResult } from '../../../database/entities/match-result.entity';
import { SoloTypingResult } from '../../../database/entities/solo-typing-result.entity';
import { UserProgressService } from './user-progress.service';

describe('UserProgressService', () => {
  let service: UserProgressService;

  const aggregateBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const historyBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const raceBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
  };

  const soloResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  const matchResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    soloResultRepository.createQueryBuilder
      .mockReturnValueOnce(aggregateBuilder)
      .mockReturnValueOnce(historyBuilder);
    matchResultRepository.createQueryBuilder.mockReturnValue(raceBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProgressService,
        { provide: getRepositoryToken(SoloTypingResult), useValue: soloResultRepository },
        { provide: getRepositoryToken(MatchResult), useValue: matchResultRepository },
      ],
    }).compile();

    service = module.get(UserProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns zeros and empty lists when the user has no results', async () => {
    aggregateBuilder.getRawOne.mockResolvedValue({
      total_sessions: '0',
      personal_best_wpm: null,
      average_wpm: null,
      average_accuracy: null,
    });
    raceBuilder.getCount.mockResolvedValue(0);
    historyBuilder.getMany.mockResolvedValue([]);

    const result = await service.getProgress('user-1');

    expect(aggregateBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId: 'user-1' });
    expect(raceBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId: 'user-1' });
    expect(result).toEqual({
      personal_best_wpm: 0,
      average_wpm: 0,
      average_accuracy: 0,
      total_sessions: 0,
      total_races: 0,
      recent: [],
      history: [],
    });
  });

  it('aggregates stored scores for that user and keeps history chronological', async () => {
    aggregateBuilder.getRawOne.mockResolvedValue({
      total_sessions: '2',
      personal_best_wpm: '90.00',
      average_wpm: '80.00',
      average_accuracy: '97.50',
    });
    raceBuilder.getCount.mockResolvedValue(0);
    historyBuilder.getMany.mockResolvedValue([
      {
        id: '2',
        net_wpm: '90.00',
        gross_wpm: '92.00',
        accuracy: '98.00',
        duration_seconds: 30,
        created_at: new Date('2026-02-02T00:00:00.000Z'),
        passage: { language: { code: 'en', name: 'English' } },
      },
      {
        id: '1',
        net_wpm: '70.00',
        gross_wpm: '74.00',
        accuracy: '97.00',
        duration_seconds: 60,
        created_at: new Date('2026-02-01T00:00:00.000Z'),
        passage: { language: { code: 'rw', name: 'Kinyarwanda' } },
      },
    ]);

    const result = await service.getProgress('user-1');

    expect(historyBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId: 'user-1' });
    expect(result.personal_best_wpm).toBe(90);
    expect(result.average_wpm).toBe(80);
    expect(result.average_accuracy).toBe(97.5);
    expect(result.total_sessions).toBe(2);
    expect(result.total_races).toBe(0);
    expect(result.recent.map((point) => point.id)).toEqual([2, 1]);
    expect(result.history.map((point) => point.id)).toEqual([1, 2]);
    expect(result.history[0].language_code).toBe('rw');
  });
});
