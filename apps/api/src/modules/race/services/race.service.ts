import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchParticipantStatus } from 'src/common/enums/MatchParticipantStatus';
import { MatchResultStatus } from 'src/common/enums/MatchResultStatus';
import { MatchStatus } from 'src/common/enums/MatchStatus';
import { RaceMode } from 'src/common/enums/RaceMode';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { Avatar } from 'src/database/entities/avatar.entity';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { MatchParticipant } from 'src/database/entities/match-participant.entity';
import { MatchResult } from 'src/database/entities/match-result.entity';
import { Match } from 'src/database/entities/match.entity';
import { Room } from 'src/database/entities/room.entity';
import { RoomPlayer } from 'src/database/entities/room-player.entity';
import { TypingPassage } from 'src/database/entities/typing-passage.entity';
import { guestDisplayName } from 'src/modules/guest/guest-display-name';
import { TypingScoreService } from 'src/modules/practice/services/typing-score.service';
import { RoomService } from 'src/modules/room/services/room.service';
import {
  acceptsTypedUpdate,
  appendPaceSample,
  correctPrefixLength,
  countTypingDelta,
  isExactCompletion,
  scoreRaceProgress,
  type RacePaceSample,
} from '../race-progress';
import { RaceAnalytics, RaceEmitter, RaceStanding, RaceSync } from '../race.types';
import { RaceTextService } from './race-text.service';

export const COUNTDOWN_MS = 3_000;

interface RacerState {
  guestId: string;
  userId: string | null;
  participantId: string;
  nickname: string;
  avatarUrl: string | null;
  typedText: string;
  progress: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  corrections: number;
  paceSamples: RacePaceSample[];
  personalBest: boolean;
  finished: boolean;
  completionTimeMs: number | null;
  disconnected: boolean;
}

interface RaceRuntime {
  code: string;
  roomId: string;
  matchId: string;
  passage: string;
  durationSeconds: number;
  phase: 'countdown' | 'running' | 'finished';
  scheduledStart: number;
  startedAt: number | null;
  deadlineAt: number | null;
  racers: Map<string, RacerState>;
  countdownTimer?: NodeJS.Timeout;
  deadlineTimer?: NodeJS.Timeout;
  paceTimer?: NodeJS.Timeout;
}

@Injectable()
export class RaceService implements OnModuleDestroy {
  private readonly logger = new Logger(RaceService.name);
  private readonly runtimes = new Map<string, RaceRuntime>();
  private readonly guestRooms = new Map<string, string>();
  private emitter: RaceEmitter = () => undefined;

  constructor(
    private readonly roomService: RoomService,
    private readonly raceText: RaceTextService,
    private readonly typingScore: TypingScoreService,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchParticipant)
    private readonly participantRepository: Repository<MatchParticipant>,
    @InjectRepository(MatchResult)
    private readonly resultRepository: Repository<MatchResult>,
  ) {}

  bindEmitter(emitter: RaceEmitter): void {
    this.emitter = emitter;
  }

  onModuleDestroy(): void {
    for (const runtime of this.runtimes.values()) {
      this.clearTimers(runtime);
    }
    this.runtimes.clear();
    this.guestRooms.clear();
  }

  async start(guest: GuestSession, code: string, connectedGuestIds: string[]): Promise<void> {
    const room = await this.roomService.loadByCode(code);
    const players = this.roomService.assertCanStart(guest, room, connectedGuestIds);
    if (this.runtimes.has(room.code)) {
      throw new ConflictException('Race cannot be started');
    }

    const passage = await this.raceText.generate({
      languageId: String(room.language.id),
      languageCode: room.language.code,
      difficulty: room.difficulty,
    });

    const scheduledStart = Date.now() + COUNTDOWN_MS;
    const saved = await this.matchRepository.manager.transaction(async (manager) => {
      const locked = await manager.findOne(Room, {
        where: { id: room.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.status !== RoomStatus.WAITING) {
        throw new ConflictException('Race cannot be started');
      }

      const match = await manager.save(
        manager.create(Match, {
          room: { id: room.id } as Room,
          passage: { id: passage.id } as TypingPassage,
          duration_seconds: room.duration_seconds,
          race_mode: RaceMode.FINISH_FIRST,
          max_race_seconds: room.duration_seconds,
          status: MatchStatus.COUNTDOWN,
          starts_at: new Date(scheduledStart),
        }),
      );
      const participants: MatchParticipant[] = [];
      for (const player of players) {
        participants.push(
          await manager.save(
            manager.create(MatchParticipant, {
              match: { id: match.id } as Match,
              guest: { id: player.guest.id } as GuestSession,
              status: MatchParticipantStatus.ACTIVE,
              ...(player.guest.avatar?.id
                ? { avatar: { id: player.guest.avatar.id } as Avatar }
                : {}),
            }),
          ),
        );
      }
      await manager.update(Room, room.id, { status: RoomStatus.COUNTDOWN });
      return { match, participants };
    });

    const runtime: RaceRuntime = {
      code: room.code,
      roomId: room.id,
      matchId: saved.match.id,
      passage: passage.content,
      durationSeconds: room.duration_seconds,
      phase: 'countdown',
      scheduledStart,
      startedAt: null,
      deadlineAt: null,
      racers: new Map(
        saved.participants.map((participant, index) => {
          const player = players[index] as RoomPlayer;
          const state = this.freshRacer(player, participant.id);
          return [state.guestId, state] as const;
        }),
      ),
    };
    this.remember(runtime);
    this.emit(room.code, 'race:countdown', {
      starts_at: scheduledStart,
      server_now: Date.now(),
      passage: runtime.passage,
      duration_seconds: runtime.durationSeconds,
    });
    runtime.countdownTimer = setTimeout(
      () => {
        void this.beginRace(room.code).catch((error: unknown) => {
          this.logger.error(`Could not start race ${room.code}`, error);
        });
      },
      Math.max(0, scheduledStart - Date.now()),
    );
  }

  async progress(guest: GuestSession, code: string, typedText: string): Promise<void> {
    const runtime = this.requireRunning(code);
    if (runtime.deadlineAt != null && Date.now() >= runtime.deadlineAt) {
      await this.finish(runtime.code);
      return;
    }

    const racer = runtime.racers.get(String(guest.id));
    if (!racer) {
      throw new ForbiddenException('You are not in this race');
    }
    if (racer.finished) {
      return;
    }

    if (typedText.length > runtime.passage.length) {
      throw new BadRequestException('Progress update is too long');
    }
    if (!acceptsTypedUpdate(racer.typedText, typedText)) {
      throw new BadRequestException('Progress update does not continue the current text');
    }
    if (typedText === racer.typedText) {
      return;
    }

    const now = new Date();
    const elapsed = now.getTime() - (runtime.startedAt ?? now.getTime());
    if (!this.typingScore.isPlausible(typedText.length, elapsed)) {
      throw new BadRequestException('Progress update is not plausible');
    }

    racer.disconnected = false;
    const score = this.applyScore(racer, runtime, typedText, now.getTime());

    if (isExactCompletion(runtime.passage, typedText)) {
      racer.finished = true;
      racer.progress = 100;
      racer.completionTimeMs = score.elapsedMs;
      this.capturePace(racer, runtime, now.getTime());
      await this.participantRepository.update(racer.participantId, {
        status: MatchParticipantStatus.FINISHED,
        finished_at: now,
      });
    }

    if (this.everyoneSettled(runtime)) {
      await this.finish(runtime.code);
      return;
    }

    this.emitStandings(runtime);
  }

  async rematch(guest: GuestSession, code: string): Promise<void> {
    const room = await this.roomService.loadByCode(code);
    if (String(room.host_guest.id) !== String(guest.id)) {
      throw new ForbiddenException('Only the host can start another race');
    }
    if (room.status !== RoomStatus.FINISHED && room.status !== RoomStatus.WAITING) {
      throw new ConflictException('The race is still in progress');
    }

    this.clearRuntime(room.code);
    await this.roomService.resetLobby(room.id);
  }

  markDisconnected(guestId: string): void {
    const runtime = this.runtimeForGuest(guestId);
    if (!runtime || runtime.phase === 'finished') {
      return;
    }

    const racer = runtime.racers.get(String(guestId));
    if (!racer || racer.finished || racer.disconnected) {
      return;
    }

    racer.disconnected = true;
    if (this.everyoneSettled(runtime)) {
      void this.finish(runtime.code);
      return;
    }
    if (runtime.phase === 'running') {
      this.emitStandings(runtime);
    }
  }

  markReconnected(guestId: string): void {
    const runtime = this.runtimeForGuest(guestId);
    const racer = runtime?.racers.get(String(guestId));
    if (!runtime || !racer || runtime.phase === 'finished') {
      return;
    }

    racer.disconnected = false;
    if (runtime.phase === 'running') {
      this.emitStandings(runtime);
    }
  }

  syncFor(code: string, guestId: string): RaceSync | null {
    const runtime = this.runtimeForCode(code);
    if (!runtime) {
      return null;
    }

    return {
      phase: runtime.phase,
      passage: runtime.passage,
      typed_text: runtime.racers.get(String(guestId))?.typedText ?? '',
      starts_at: runtime.startedAt ?? runtime.scheduledStart,
      deadline_at: runtime.deadlineAt,
      server_now: Date.now(),
      duration_seconds: runtime.durationSeconds,
      racers: this.standings(runtime, runtime.phase === 'finished'),
    };
  }

  private async beginRace(code: string): Promise<void> {
    const runtime = this.runtimeForCode(code);
    if (!runtime || runtime.phase !== 'countdown') {
      return;
    }

    runtime.phase = 'running';
    runtime.startedAt = runtime.scheduledStart;
    runtime.deadlineAt = runtime.scheduledStart + runtime.durationSeconds * 1000;
    await this.matchRepository.update(runtime.matchId, {
      status: MatchStatus.RUNNING,
      starts_at: new Date(runtime.startedAt),
      deadline_at: new Date(runtime.deadlineAt),
    });
    await this.roomService.applyStatus(runtime.roomId, RoomStatus.RACING);
    this.emit(runtime.code, 'race:started', {
      started_at: runtime.startedAt,
      deadline_at: runtime.deadlineAt,
      server_now: Date.now(),
    });
    for (const racer of runtime.racers.values()) {
      this.capturePace(racer, runtime, runtime.startedAt);
    }
    runtime.paceTimer = setInterval(() => {
      this.captureOpenPace(runtime);
    }, 1_000);
    runtime.deadlineTimer = setTimeout(
      () => {
        void this.finish(runtime.code).catch((error: unknown) => {
          this.logger.error(`Could not finish race ${runtime.code}`, error);
        });
      },
      Math.max(0, runtime.deadlineAt - Date.now()),
    );
  }

  private async finish(code: string): Promise<void> {
    const runtime = this.runtimeForCode(code);
    if (!runtime || runtime.phase === 'finished') {
      return;
    }

    runtime.phase = 'finished';
    this.clearTimers(runtime);
    const finishedAt = new Date();
    const endedAt = this.scoreEndedAt(runtime, finishedAt);
    this.rescoreOpenRacers(runtime, endedAt);
    for (const racer of runtime.racers.values()) {
      if (!racer.finished) {
        this.capturePace(racer, runtime, endedAt);
      }
    }
    await this.markPersonalBests(runtime);
    const ranked = this.rank(runtime);

    try {
      await this.matchRepository.update(runtime.matchId, {
        status: MatchStatus.COMPLETED,
        ends_at: finishedAt,
        completed_at: finishedAt,
      });
      await this.roomService.applyStatus(runtime.roomId, RoomStatus.FINISHED);
      await this.resultRepository.save(
        ranked.map((racer, index) =>
          this.resultRepository.create({
            match: { id: runtime.matchId } as Match,
            guest: { id: racer.guestId } as GuestSession,
            gross_wpm: racer.grossWpm.toFixed(2),
            net_wpm: racer.netWpm.toFixed(2),
            accuracy: racer.accuracy.toFixed(2),
            correct_chars: racer.correctChars,
            incorrect_chars: racer.incorrectChars,
            completion_time_ms: racer.finished ? racer.completionTimeMs : null,
            rank_position: index + 1,
            is_finished: racer.finished,
            final_progress: racer.progress.toFixed(2),
            status: this.resultStatus(racer),
            pace_samples: racer.paceSamples.length > 0 ? racer.paceSamples : null,
            correct_keystrokes: racer.correctKeystrokes,
            incorrect_keystrokes: racer.incorrectKeystrokes,
            corrections: racer.corrections,
            is_personal_best: racer.personalBest,
          }),
        ),
      );
      for (const racer of ranked) {
        if (racer.finished) {
          continue;
        }
        await this.participantRepository.update(racer.participantId, {
          status: racer.disconnected
            ? MatchParticipantStatus.DISCONNECTED
            : MatchParticipantStatus.ACTIVE,
        });
      }
    } catch (error) {
      this.logger.error(`Could not save race results for room ${runtime.code}`, error);
    }

    this.emit(runtime.code, 'race:finished', {
      server_now: Date.now(),
      racers: this.standings(runtime, true),
    });
  }

  private requireRunning(code: string): RaceRuntime {
    const runtime = this.runtimeForCode(code);
    if (!runtime || runtime.phase === 'countdown') {
      throw new ConflictException('Race has not started');
    }
    if (runtime.phase === 'finished') {
      throw new ConflictException('Race is already over');
    }
    return runtime;
  }

  private freshRacer(player: RoomPlayer, participantId: string): RacerState {
    return {
      guestId: String(player.guest.id),
      userId: player.guest.user?.id ? String(player.guest.user.id) : null,
      participantId,
      nickname: guestDisplayName(player.guest),
      avatarUrl: player.guest.user?.avatar_url || player.guest.avatar?.asset_path || null,
      typedText: '',
      progress: 0,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 0,
      correctChars: 0,
      incorrectChars: 0,
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      corrections: 0,
      paceSamples: [],
      personalBest: false,
      finished: false,
      completionTimeMs: null,
      disconnected: false,
    };
  }

  private everyoneSettled(runtime: RaceRuntime): boolean {
    for (const racer of runtime.racers.values()) {
      if (!racer.finished && !racer.disconnected) {
        return false;
      }
    }
    return runtime.racers.size > 0;
  }

  private rank(runtime: RaceRuntime): RacerState[] {
    return [...runtime.racers.values()].sort((left, right) => {
      if (left.finished !== right.finished) {
        return left.finished ? -1 : 1;
      }
      if (left.finished && right.finished) {
        const time =
          (left.completionTimeMs ?? Number.MAX_SAFE_INTEGER) -
          (right.completionTimeMs ?? Number.MAX_SAFE_INTEGER);
        if (time !== 0) {
          return time;
        }
      } else if (left.progress !== right.progress) {
        return right.progress - left.progress;
      } else if (left.netWpm !== right.netWpm) {
        return right.netWpm - left.netWpm;
      }
      return left.guestId.localeCompare(right.guestId);
    });
  }

  private standings(runtime: RaceRuntime, withAnalytics = false): RaceStanding[] {
    return this.rank(runtime).map((racer, index) => {
      const standing: RaceStanding = {
        guest_id: Number(racer.guestId),
        nickname: racer.nickname,
        avatar_url: racer.avatarUrl,
        progress: racer.progress,
        wpm: racer.netWpm,
        accuracy: racer.accuracy,
        finished: racer.finished,
        rank: index + 1,
        disconnected: racer.disconnected,
        completion_time_ms: racer.completionTimeMs,
      };
      if (withAnalytics) {
        standing.analytics = this.analyticsFor(racer);
      }
      return standing;
    });
  }

  private analyticsFor(racer: RacerState): RaceAnalytics {
    return {
      pace: racer.paceSamples.map((sample) => ({ ...sample })),
      correct_keystrokes: racer.correctKeystrokes,
      incorrect_keystrokes: racer.incorrectKeystrokes,
      corrections: racer.corrections,
      personal_best: racer.personalBest,
    };
  }

  private applyScore(racer: RacerState, runtime: RaceRuntime, typedText: string, endedAt: number) {
    const delta = countTypingDelta(runtime.passage, racer.typedText, typedText);
    racer.correctKeystrokes += delta.correctKeystrokes;
    racer.incorrectKeystrokes += delta.incorrectKeystrokes;
    racer.corrections += delta.corrections;
    const score = scoreRaceProgress(
      runtime.passage,
      typedText,
      runtime.startedAt ?? endedAt,
      endedAt,
      runtime.durationSeconds,
    );
    racer.typedText = typedText;
    racer.progress = score.progress;
    racer.grossWpm = score.grossWpm;
    racer.netWpm = score.netWpm;
    racer.accuracy = score.accuracy;
    racer.correctChars = score.correctChars;
    racer.incorrectChars = score.incorrectChars;
    return score;
  }

  private scoreEndedAt(runtime: RaceRuntime, finishedAt: Date): number {
    if (runtime.deadlineAt != null && finishedAt.getTime() >= runtime.deadlineAt) {
      return runtime.deadlineAt;
    }
    return finishedAt.getTime();
  }

  private rescoreOpenRacers(runtime: RaceRuntime, endedAt: number): void {
    if (runtime.startedAt == null) {
      return;
    }
    for (const racer of runtime.racers.values()) {
      if (racer.finished) {
        continue;
      }
      this.applyScore(racer, runtime, racer.typedText, endedAt);
    }
  }

  private capturePace(racer: RacerState, runtime: RaceRuntime, endedAt: number): void {
    if (runtime.startedAt == null) {
      return;
    }
    appendPaceSample(
      racer.paceSamples,
      {
        t: Math.max(0, endedAt - runtime.startedAt),
        prefix: correctPrefixLength(runtime.passage, racer.typedText),
        incorrect: racer.incorrectChars,
        typed: racer.typedText.length,
      },
      runtime.durationSeconds,
    );
  }

  private captureOpenPace(runtime: RaceRuntime): void {
    if (runtime.phase !== 'running' || runtime.startedAt == null) {
      return;
    }
    const now = Date.now();
    for (const racer of runtime.racers.values()) {
      if (racer.finished) {
        continue;
      }
      this.capturePace(racer, runtime, now);
    }
  }

  private async markPersonalBests(runtime: RaceRuntime): Promise<void> {
    try {
      const bests = await this.previousBests(runtime);
      for (const racer of runtime.racers.values()) {
        const prior = bests.get(racer.guestId);
        racer.personalBest = racer.finished && prior != null && racer.netWpm > prior;
      }
    } catch (error) {
      this.logger.error(`Could not compare race personal bests for room ${runtime.code}`, error);
    }
  }

  private async previousBests(runtime: RaceRuntime): Promise<Map<string, number>> {
    const guestIds = [...runtime.racers.keys()];
    if (guestIds.length === 0) {
      return new Map();
    }

    const userIds = [
      ...new Set(
        [...runtime.racers.values()]
          .map((racer) => racer.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];
    const identity =
      userIds.length > 0
        ? '(guest.id IN (:...guestIds) OR account.id IN (:...userIds))'
        : 'guest.id IN (:...guestIds)';
    const rows = await this.resultRepository
      .createQueryBuilder('result')
      .innerJoin('result.guest', 'guest')
      .innerJoin('result.match', 'match')
      .leftJoin('guest.user', 'account')
      .select('guest.id', 'guest_id')
      .addSelect('account.id', 'user_id')
      .addSelect('MAX(result.net_wpm)', 'best_wpm')
      .where('result.is_finished = :finished', { finished: true })
      .andWhere('match.id != :matchId', { matchId: runtime.matchId })
      .andWhere(identity, { guestIds, userIds })
      .groupBy('guest.id')
      .addGroupBy('account.id')
      .getRawMany<{
        guest_id: string | number;
        user_id: string | number | null;
        best_wpm: string | number | null;
      }>();

    const byGuest = new Map<string, number>();
    const byUser = new Map<string, number>();
    for (const row of rows) {
      const wpm = Number(row.best_wpm);
      if (!Number.isFinite(wpm)) {
        continue;
      }
      const guestId = String(row.guest_id);
      const guestBest = byGuest.get(guestId);
      byGuest.set(guestId, guestBest == null ? wpm : Math.max(guestBest, wpm));
      if (row.user_id != null && String(row.user_id).length > 0) {
        const userId = String(row.user_id);
        const userBest = byUser.get(userId);
        byUser.set(userId, userBest == null ? wpm : Math.max(userBest, wpm));
      }
    }

    const bests = new Map<string, number>();
    for (const racer of runtime.racers.values()) {
      const candidates: number[] = [];
      const guestBest = byGuest.get(racer.guestId);
      if (guestBest != null) {
        candidates.push(guestBest);
      }
      if (racer.userId) {
        const userBest = byUser.get(racer.userId);
        if (userBest != null) {
          candidates.push(userBest);
        }
      }
      if (candidates.length > 0) {
        bests.set(racer.guestId, Math.max(...candidates));
      }
    }
    return bests;
  }

  private resultStatus(racer: RacerState): MatchResultStatus {
    if (racer.finished) {
      return MatchResultStatus.COMPLETED;
    }
    if (racer.disconnected) {
      return MatchResultStatus.DISCONNECTED;
    }
    return MatchResultStatus.UNFINISHED;
  }

  private remember(runtime: RaceRuntime): void {
    this.runtimes.set(runtime.code, runtime);
    for (const guestId of runtime.racers.keys()) {
      this.guestRooms.set(guestId, runtime.code);
    }
  }

  private clearRuntime(code: string): void {
    const runtime = this.runtimeForCode(code);
    if (!runtime) {
      return;
    }
    this.clearTimers(runtime);
    for (const guestId of runtime.racers.keys()) {
      this.guestRooms.delete(guestId);
    }
    this.runtimes.delete(runtime.code);
  }

  private clearTimers(runtime: RaceRuntime): void {
    if (runtime.countdownTimer) {
      clearTimeout(runtime.countdownTimer);
      runtime.countdownTimer = undefined;
    }
    if (runtime.deadlineTimer) {
      clearTimeout(runtime.deadlineTimer);
      runtime.deadlineTimer = undefined;
    }
    if (runtime.paceTimer) {
      clearInterval(runtime.paceTimer);
      runtime.paceTimer = undefined;
    }
  }

  private runtimeForCode(code: string): RaceRuntime | undefined {
    return this.runtimes.get(code.trim().toUpperCase());
  }

  private runtimeForGuest(guestId: string): RaceRuntime | undefined {
    const code = this.guestRooms.get(String(guestId));
    return code ? this.runtimes.get(code) : undefined;
  }

  private emitStandings(runtime: RaceRuntime): void {
    this.emit(runtime.code, 'race:standings', {
      server_now: Date.now(),
      racers: this.standings(runtime),
    });
  }

  private emit(code: string, event: string, payload: unknown): void {
    this.emitter(code, event, payload);
  }
}
