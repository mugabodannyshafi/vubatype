import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseService } from 'src/base.service';
import { PracticeSessionStatus } from 'src/common/enums/PracticeSessionStatus';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { PracticeSession } from 'src/database/entities/practice-session.entity';
import { SoloTypingResult } from 'src/database/entities/solo-typing-result.entity';
import { TypingPassage } from 'src/database/entities/typing-passage.entity';
import { LanguageService } from 'src/modules/language/services/language.service';
import { FinishPracticeSessionDto } from '../dto/finish-practice-session.dto';
import { PracticeResultsQueryDto } from '../dto/practice-results-query.dto';
import { StartPracticeSessionDto } from '../dto/start-practice-session.dto';
import { PassageGeneratorService } from './passage-generator.service';
import { TypingScoreService } from './typing-score.service';

const PRACTICE_FINISH_GRACE_MS = 3000;
const PRACTICE_TYPED_TEXT_EXTRA_CHARS = 50;
const DEFAULT_RESULTS_PAGE = 1;
const DEFAULT_RESULTS_LIMIT = 20;
const TIMESTAMP_FORMAT = 'yyyy-MM-dd HH:mm:ss';

export interface PracticeLanguageView {
  id: number;
  code: string;
  name: string;
}

export interface PracticePassageView {
  id: number;
  content: string;
  difficulty: WordDifficulty;
  character_count: number;
  language: PracticeLanguageView;
}

export interface PracticeSessionView {
  id: number;
  status: PracticeSessionStatus;
  duration_seconds: number;
  started_at: string | null;
  expires_at: string | null;
  finished_at: string | null;
  passage: PracticePassageView;
}

export interface PracticeResultView {
  id: number;
  session_id: number | null;
  duration_seconds: number;
  elapsed_time_ms: number;
  gross_wpm: number;
  net_wpm: number;
  accuracy: number;
  correct_chars: number;
  incorrect_chars: number;
  keystrokes_verified: false;
  created_at: string | null;
  passage: PracticePassageView;
}

type FinishOutcome =
  | { type: 'not_found' }
  | { type: 'completed' }
  | { type: 'expired' }
  | { type: 'result'; view: PracticeResultView };

@Injectable()
export class PracticeService extends BaseService {
  constructor(
    @InjectRepository(PracticeSession)
    private readonly sessionRepository: Repository<PracticeSession>,
    @InjectRepository(SoloTypingResult)
    private readonly resultRepository: Repository<SoloTypingResult>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly languageService: LanguageService,
    private readonly passageGenerator: PassageGeneratorService,
    private readonly typingScoreService: TypingScoreService,
  ) {
    super();
  }

  async start(guest: GuestSession, dto: StartPracticeSessionDto): Promise<PracticeSessionView> {
    const language = await this.languageService.findAvailableByCode(dto.language_code);
    const passage = await this.passageGenerator.generate({
      languageId: String(language.id),
      difficulty: dto.difficulty,
      durationSeconds: dto.duration_seconds,
    });
    const startedAt = new Date();
    const session = this.sessionRepository.create({
      guest: { id: guest.id } as GuestSession,
      passage,
      duration_seconds: dto.duration_seconds,
      status: PracticeSessionStatus.ACTIVE,
      started_at: startedAt,
      expires_at: new Date(startedAt.getTime() + dto.duration_seconds * 1000),
    });
    const saved = await this.sessionRepository.save(session);
    saved.passage = passage;
    return this.toSessionView(saved);
  }

  async getSession(guest: GuestSession, sessionId: string): Promise<PracticeSessionView> {
    const session = await this.findOwnedSession(
      guest.id,
      this.parseId(sessionId, 'Practice session not found'),
    );
    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    if (
      session.status === PracticeSessionStatus.ACTIVE &&
      new Date().getTime() > session.expires_at.getTime()
    ) {
      await this.sessionRepository.update(session.id, {
        status: PracticeSessionStatus.EXPIRED,
      });
      session.status = PracticeSessionStatus.EXPIRED;
    }

    return this.toSessionView(session);
  }

  async finish(
    guest: GuestSession,
    sessionId: string,
    dto: FinishPracticeSessionDto,
  ): Promise<PracticeResultView> {
    const id = this.parseId(sessionId, 'Practice session not found');
    const outcome = await this.entityManager.transaction((manager) =>
      this.finishInTransaction(manager, guest.id, id, dto.typed_text),
    );

    if (outcome.type === 'not_found') {
      throw new NotFoundException('Practice session not found');
    }
    if (outcome.type === 'completed') {
      throw new ConflictException('Practice session is already finished');
    }
    if (outcome.type === 'expired') {
      throw new ConflictException('Practice session has expired');
    }
    return outcome.view;
  }

  async listResults(guest: GuestSession, query: PracticeResultsQueryDto) {
    const page = query.page ?? DEFAULT_RESULTS_PAGE;
    const limit = query.limit ?? DEFAULT_RESULTS_LIMIT;
    const [results, total] = await this.resultRepository.findAndCount({
      where: { guest: { id: guest.id } },
      relations: { passage: { language: true } },
      order: { created_at: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const sessionIds = await this.findSessionIdsForResults(results.map((result) => result.id));
    const items = results.map((result) =>
      this.toResultView(result, result.passage, sessionIds.get(result.id) ?? null),
    );

    return this.paginate(items, total, {
      currentPage: page,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getResult(guest: GuestSession, resultId: string): Promise<PracticeResultView> {
    const id = this.parseId(resultId, 'Practice result not found');
    const result = await this.resultRepository.findOne({
      where: { id, guest: { id: guest.id } },
      relations: { passage: { language: true } },
    });
    if (!result) {
      throw new NotFoundException('Practice result not found');
    }

    const sessionIds = await this.findSessionIdsForResults([result.id]);
    return this.toResultView(result, result.passage, sessionIds.get(result.id) ?? null);
  }

  private async finishInTransaction(
    manager: EntityManager,
    guestId: string,
    sessionId: string,
    typedText: string,
  ): Promise<FinishOutcome> {
    const locked: Array<{ id: string }> = await manager.query(
      `SELECT "id"
       FROM "practice_sessions"
       WHERE "id" = $1::bigint AND "guest_id" = $2::bigint
       FOR UPDATE`,
      [sessionId, guestId],
    );
    if (locked.length === 0) {
      return { type: 'not_found' };
    }

    const session = await manager.findOne(PracticeSession, {
      where: { id: sessionId },
      relations: { passage: { language: true } },
    });
    if (!session) {
      return { type: 'not_found' };
    }
    if (session.status === PracticeSessionStatus.COMPLETED) {
      return { type: 'completed' };
    }

    const now = new Date();
    const pastGrace = now.getTime() > session.expires_at.getTime() + PRACTICE_FINISH_GRACE_MS;
    if (session.status === PracticeSessionStatus.EXPIRED || pastGrace) {
      if (session.status === PracticeSessionStatus.ACTIVE) {
        await manager.update(PracticeSession, session.id, {
          status: PracticeSessionStatus.EXPIRED,
        });
      }
      return { type: 'expired' };
    }

    if (typedText.length > session.passage.content.length + PRACTICE_TYPED_TEXT_EXTRA_CHARS) {
      throw new BadRequestException('Submitted text is longer than the passage allows');
    }

    const score = this.typingScoreService.score({
      passage: session.passage.content,
      typedText,
      startedAt: session.started_at,
      finishedAt: now,
      durationSeconds: session.duration_seconds,
    });
    if (!this.typingScoreService.isPlausible(typedText.length, score.elapsed_time_ms)) {
      throw new BadRequestException('Submitted text exceeds plausible typing speed');
    }

    const result = manager.create(SoloTypingResult, {
      guest: { id: guestId } as GuestSession,
      passage: session.passage,
      duration_seconds: session.duration_seconds,
      elapsed_time_ms: score.elapsed_time_ms,
      gross_wpm: score.gross_wpm.toFixed(2),
      net_wpm: score.net_wpm.toFixed(2),
      accuracy: score.accuracy.toFixed(2),
      correct_chars: score.correct_chars,
      incorrect_chars: score.incorrect_chars,
    });
    const savedResult = await manager.save(result);
    await manager.update(PracticeSession, session.id, {
      status: PracticeSessionStatus.COMPLETED,
      finished_at: now,
      result: savedResult,
    });

    return {
      type: 'result',
      view: this.toResultView(savedResult, session.passage, session.id),
    };
  }

  private async findOwnedSession(
    guestId: string,
    sessionId: string,
  ): Promise<PracticeSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId, guest: { id: guestId } },
      relations: { passage: { language: true } },
    });
  }

  private async findSessionIdsForResults(resultIds: string[]): Promise<Map<string, string>> {
    if (resultIds.length === 0) {
      return new Map();
    }

    const sessions = await this.sessionRepository.find({
      where: { result: { id: In(resultIds) } },
      relations: { result: true },
    });
    const sessionIds = new Map<string, string>();
    for (const session of sessions) {
      if (session.result) {
        sessionIds.set(session.result.id, session.id);
      }
    }
    return sessionIds;
  }

  private toSessionView(session: PracticeSession): PracticeSessionView {
    return {
      id: Number(session.id),
      status: session.status,
      duration_seconds: session.duration_seconds,
      started_at: this.formatTimestamp(session.started_at),
      expires_at: this.formatTimestamp(session.expires_at),
      finished_at: this.formatTimestamp(session.finished_at),
      passage: this.toPassageView(session.passage),
    };
  }

  private toResultView(
    result: SoloTypingResult,
    passage: TypingPassage,
    sessionId: string | null,
  ): PracticeResultView {
    return {
      id: Number(result.id),
      session_id: sessionId === null ? null : Number(sessionId),
      duration_seconds: result.duration_seconds,
      elapsed_time_ms: result.elapsed_time_ms,
      gross_wpm: Number(result.gross_wpm),
      net_wpm: Number(result.net_wpm),
      accuracy: Number(result.accuracy),
      correct_chars: result.correct_chars,
      incorrect_chars: result.incorrect_chars,
      keystrokes_verified: false,
      created_at: this.formatTimestamp(result.created_at),
      passage: this.toPassageView(passage),
    };
  }

  private toPassageView(passage: TypingPassage): PracticePassageView {
    return {
      id: Number(passage.id),
      content: passage.content,
      difficulty: passage.difficulty,
      character_count: passage.character_count,
      language: {
        id: Number(passage.language.id),
        code: passage.language.code,
        name: passage.language.name,
      },
    };
  }

  private formatTimestamp(value?: Date | null): string | null {
    if (!value) {
      return null;
    }
    return DateTime.fromJSDate(value).toFormat(TIMESTAMP_FORMAT);
  }

  private parseId(id: string, message: string): string {
    if (!/^\d{1,19}$/.test(id)) {
      throw new NotFoundException(message);
    }
    return id;
  }
}
