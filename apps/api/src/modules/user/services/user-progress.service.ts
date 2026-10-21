import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';
import { MatchResult } from '../../../database/entities/match-result.entity';
import { SoloTypingResult } from '../../../database/entities/solo-typing-result.entity';

const HISTORY_LIMIT = 100;
const RECENT_LIMIT = 10;
const TIMESTAMP_FORMAT = 'yyyy-MM-dd HH:mm:ss';

export interface ProgressResultPoint {
  id: number;
  net_wpm: number;
  gross_wpm: number;
  accuracy: number;
  duration_seconds: number;
  language_code: string | null;
  language_name: string | null;
  created_at: string | null;
}

export interface UserProgress {
  personal_best_wpm: number;
  average_wpm: number;
  average_accuracy: number;
  total_sessions: number;
  total_races: number;
  recent: ProgressResultPoint[];
  history: ProgressResultPoint[];
}

interface ProgressAggregate {
  total_sessions: string | number | null;
  personal_best_wpm: string | number | null;
  average_wpm: string | number | null;
  average_accuracy: string | number | null;
}

@Injectable()
export class UserProgressService {
  constructor(
    @InjectRepository(SoloTypingResult)
    private readonly soloResultRepository: Repository<SoloTypingResult>,
    @InjectRepository(MatchResult)
    private readonly matchResultRepository: Repository<MatchResult>,
  ) {}

  async getProgress(userId: string): Promise<UserProgress> {
    const aggregate = await this.soloResultRepository
      .createQueryBuilder('result')
      .innerJoin('result.guest', 'guest')
      .innerJoin('guest.user', 'user')
      .where('user.id = :userId', { userId })
      .select('COUNT(result.id)', 'total_sessions')
      .addSelect('MAX(result.net_wpm)', 'personal_best_wpm')
      .addSelect('AVG(result.net_wpm)', 'average_wpm')
      .addSelect('AVG(result.accuracy)', 'average_accuracy')
      .getRawOne<ProgressAggregate>();

    const totalRaces = await this.matchResultRepository
      .createQueryBuilder('result')
      .innerJoin('result.guest', 'guest')
      .innerJoin('guest.user', 'user')
      .where('user.id = :userId', { userId })
      .getCount();

    const latest = await this.soloResultRepository
      .createQueryBuilder('result')
      .innerJoin('result.guest', 'guest')
      .innerJoin('guest.user', 'user')
      .leftJoinAndSelect('result.passage', 'passage')
      .leftJoinAndSelect('passage.language', 'language')
      .where('user.id = :userId', { userId })
      .orderBy('result.created_at', 'DESC')
      .addOrderBy('result.id', 'DESC')
      .take(HISTORY_LIMIT)
      .getMany();

    const points = latest.map((result) => this.toPoint(result));

    return {
      personal_best_wpm: roundMetric(aggregate?.personal_best_wpm),
      average_wpm: roundMetric(aggregate?.average_wpm),
      average_accuracy: roundMetric(aggregate?.average_accuracy),
      total_sessions: Number(aggregate?.total_sessions ?? 0) || 0,
      total_races: totalRaces,
      recent: points.slice(0, RECENT_LIMIT),
      history: [...points].reverse(),
    };
  }

  private toPoint(result: SoloTypingResult): ProgressResultPoint {
    const language = result.passage?.language;

    return {
      id: Number(result.id),
      net_wpm: roundMetric(result.net_wpm),
      gross_wpm: roundMetric(result.gross_wpm),
      accuracy: roundMetric(result.accuracy),
      duration_seconds: result.duration_seconds,
      language_code: language?.code ?? null,
      language_name: language?.name ?? null,
      created_at: result.created_at
        ? DateTime.fromJSDate(result.created_at).toFormat(TIMESTAMP_FORMAT)
        : null,
    };
  }
}

function roundMetric(value: string | number | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
}
