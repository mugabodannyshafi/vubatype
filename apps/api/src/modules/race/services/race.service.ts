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
import { PassageGeneratorService } from 'src/modules/practice/services/passage-generator.service';
import { TypingScoreService } from 'src/modules/practice/services/typing-score.service';
import { RoomService } from 'src/modules/room/services/room.service';
import { RaceEmitter, RaceStanding, RaceSync } from '../race.types';

export const COUNTDOWN_MS = 3_000;
const TYPED_TEXT_OVERFLOW = 50;
const RACE_PASSAGE_SOURCE = 'race';

interface RacerState {
  guestId: string;
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
}

@Injectable()
export class RaceService implements OnModuleDestroy {
  private readonly logger = new Logger(RaceService.name);
  private readonly runtimes = new Map<string, RaceRuntime>();
  private readonly guestRooms = new Map<string, string>();
  private emitter: RaceEmitter = () => undefined;

  constructor(
    private readonly roomService: RoomService,
    private readonly passageGenerator: PassageGeneratorService,
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

    const passage = await this.passageGenerator.generate({
      languageId: String(room.language.id),
      difficulty: room.difficulty,
      durationSeconds: room.duration_seconds,
      source: RACE_PASSAGE_SOURCE,
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
    runtime.countdownTimer = setTimeout(() => {
      void this.beginRace(room.code).catch((error: unknown) => {
        this.logger.error(`Could not start race ${room.code}`, error);
      });
    }, COUNTDOWN_MS);
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

    const now = new Date();
    if (typedText.length > runtime.passage.length + TYPED_TEXT_OVERFLOW) {
      throw new BadRequestException('Progress update is too long');
    }
    const elapsed = now.getTime() - (runtime.startedAt ?? now.getTime());
    if (!this.typingScore.isPlausible(typedText.length, elapsed)) {
      throw new BadRequestException('Progress update is not plausible');
    }

    const score = this.typingScore.score({
      passage: runtime.passage,
      typedText,
      startedAt: new Date(runtime.startedAt ?? now.getTime()),
      finishedAt: now,
      durationSeconds: runtime.durationSeconds,
    });
    racer.disconnected = false;
    racer.typedText = typedText;
    racer.progress = this.progressPercent(typedText.length, runtime.passage.length);
    racer.grossWpm = score.gross_wpm;
    racer.netWpm = score.net_wpm;
    racer.accuracy = score.accuracy;
    racer.correctChars = score.correct_chars;
    racer.incorrectChars = score.incorrect_chars;

    if (runtime.passage.length > 0 && typedText.length >= runtime.passage.length) {
      racer.finished = true;
      racer.progress = 100;
      racer.completionTimeMs = score.elapsed_time_ms;
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
    if (runtime.phase === 'running' && this.everyoneSettled(runtime)) {
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
      racers: this.standings(runtime),
    };
  }

  private async beginRace(code: string): Promise<void> {
    const runtime = this.runtimeForCode(code);
    if (!runtime || runtime.phase !== 'countdown') {
      return;
    }

    const startedAt = new Date();
    runtime.phase = 'running';
    runtime.startedAt = startedAt.getTime();
    runtime.deadlineAt = startedAt.getTime() + runtime.durationSeconds * 1000;
    await this.matchRepository.update(runtime.matchId, {
      status: MatchStatus.RUNNING,
      starts_at: startedAt,
      deadline_at: new Date(runtime.deadlineAt),
    });
    await this.roomService.applyStatus(runtime.roomId, RoomStatus.RACING);
    this.emit(runtime.code, 'race:started', {
      started_at: runtime.startedAt,
      deadline_at: runtime.deadlineAt,
      server_now: Date.now(),
    });
    runtime.deadlineTimer = setTimeout(() => {
      void this.finish(runtime.code).catch((error: unknown) => {
        this.logger.error(`Could not finish race ${runtime.code}`, error);
      });
    }, runtime.durationSeconds * 1000);
  }

  private async finish(code: string): Promise<void> {
    const runtime = this.runtimeForCode(code);
    if (!runtime || runtime.phase === 'finished') {
      return;
    }

    runtime.phase = 'finished';
    this.clearTimers(runtime);
    const finishedAt = new Date();
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
      racers: this.standings(runtime),
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
      participantId,
      nickname: player.guest.nickname,
      avatarUrl: player.guest.user?.avatar_url || player.guest.avatar?.asset_path || null,
      typedText: '',
      progress: 0,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 0,
      correctChars: 0,
      incorrectChars: 0,
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

  private standings(runtime: RaceRuntime): RaceStanding[] {
    return this.rank(runtime).map((racer, index) => ({
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
    }));
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

  private progressPercent(typedLength: number, passageLength: number): number {
    if (passageLength === 0) {
      return 0;
    }
    const value = (Math.min(typedLength, passageLength) / passageLength) * 100;
    return Math.round(value * 100) / 100;
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
