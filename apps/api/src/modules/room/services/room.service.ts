import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { DateTime } from 'luxon';
import { EntityManager, Repository } from 'typeorm';
import { BaseService } from 'src/base.service';
import { MatchStatus } from 'src/common/enums/MatchStatus';
import { RoomStatus } from 'src/common/enums/RoomStatus';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { GuestSession } from 'src/database/entities/guest-session.entity';
import { Language } from 'src/database/entities/language.entity';
import { Match } from 'src/database/entities/match.entity';
import { RoomPlayer } from 'src/database/entities/room-player.entity';
import { Room } from 'src/database/entities/room.entity';
import { LanguageInfo, LanguageService } from 'src/modules/language/services/language.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomMatchesQueryDto } from '../dto/room-matches-query.dto';

export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const ROOM_CODE_LENGTH = 8;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const MAX_ROOM_CODE_ATTEMPTS = 5;
const DEFAULT_MATCHES_PAGE = 1;
const DEFAULT_MATCHES_LIMIT = 20;
const TIMESTAMP_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface RoomGuestView {
  id: number;
  nickname: string;
}

export interface RoomLanguageView {
  id: number;
  code: string;
  name: string;
}

export interface RoomSettingsView {
  language: RoomLanguageView;
  difficulty: WordDifficulty;
  duration_seconds: number;
  max_players: number;
}

export interface RoomPlayerView {
  id: number;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string | null;
  guest: RoomGuestView;
}

export interface RoomView {
  id: number;
  code: string;
  status: RoomStatus;
  host: RoomGuestView;
  settings: RoomSettingsView;
  players: RoomPlayerView[];
  created_at: string | null;
  expires_at: string | null;
}

export interface RoomMatchView {
  id: number;
  status: MatchStatus;
  duration_seconds: number;
  created_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  completed_at: string | null;
}

interface UniqueViolation {
  table?: string;
  constraint?: string;
  detail?: string;
}

@Injectable()
export class RoomService extends BaseService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly languageService: LanguageService,
  ) {
    super();
  }

  async create(guest: GuestSession, dto: CreateRoomDto): Promise<RoomView> {
    const language = await this.languageService.findAvailableByCode(dto.language_code);

    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
      try {
        const room = await this.entityManager.transaction((manager) =>
          this.insertRoom(manager, guest, language, dto),
        );
        return this.toRoomView(room);
      } catch (error) {
        if (this.isMembershipCollision(error)) {
          throw new ConflictException('Guest is already in this room');
        }
        if (this.isRoomCodeCollision(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Could not allocate a unique room code');
  }

  async getByCode(code: string): Promise<RoomView> {
    const room = await this.findRoom(code, true);
    return this.toRoomView(room);
  }

  async listMatches(code: string, query: RoomMatchesQueryDto) {
    const room = await this.findRoom(code, false);
    const page = query.page ?? DEFAULT_MATCHES_PAGE;
    const limit = query.limit ?? DEFAULT_MATCHES_LIMIT;
    const [matches, total] = await this.matchRepository.findAndCount({
      where: { room: { id: room.id } },
      order: { created_at: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return this.paginate(
      matches.map((match) => this.toMatchView(match)),
      total,
      {
        currentPage: page,
        skip: (page - 1) * limit,
        take: limit,
      },
    );
  }

  private async insertRoom(
    manager: EntityManager,
    guest: GuestSession,
    language: LanguageInfo,
    dto: CreateRoomDto,
  ): Promise<Room> {
    const createdAt = new Date();
    const room = manager.create(Room, {
      code: this.generateCode(),
      host_guest: { id: guest.id } as GuestSession,
      language: { id: String(language.id) } as Language,
      duration_seconds: dto.duration_seconds,
      difficulty: dto.difficulty,
      max_players: dto.max_players,
      status: RoomStatus.WAITING,
      created_at: createdAt,
      expires_at: new Date(createdAt.getTime() + ROOM_TTL_MS),
    });
    const savedRoom = await manager.save(room);
    savedRoom.created_at = savedRoom.created_at ?? createdAt;

    const player = manager.create(RoomPlayer, {
      room: { id: savedRoom.id } as Room,
      guest: { id: guest.id } as GuestSession,
      is_ready: false,
    });
    const savedPlayer = await manager.save(player);
    savedPlayer.joined_at = savedPlayer.joined_at ?? savedRoom.created_at;
    savedPlayer.guest = guest;

    savedRoom.host_guest = guest;
    savedRoom.language = {
      id: String(language.id),
      code: language.code,
      name: language.name,
    } as Language;
    savedRoom.players = [savedPlayer];
    return savedRoom;
  }

  private async findRoom(code: string, withPlayers: boolean): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { code: this.normalizeCode(code) },
      relations: withPlayers
        ? { host_guest: true, language: true, players: { guest: true } }
        : undefined,
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (
      room.status === RoomStatus.WAITING &&
      room.expires_at &&
      room.expires_at.getTime() < Date.now()
    ) {
      await this.roomRepository.update(room.id, { status: RoomStatus.EXPIRED });
      room.status = RoomStatus.EXPIRED;
    }

    return room;
  }

  private generateCode(): string {
    let code = '';
    for (let index = 0; index < ROOM_CODE_LENGTH; index++) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    return code;
  }

  private normalizeCode(code: string): string {
    const normalized = (code ?? '').trim().toUpperCase();
    if (!ROOM_CODE_PATTERN.test(normalized)) {
      throw new NotFoundException('Room not found');
    }
    return normalized;
  }

  private toRoomView(room: Room): RoomView {
    const hostId = String(room.host_guest.id);
    const players = (room.players ?? [])
      .filter((player) => player.left_at == null && player.guest)
      .sort((left, right) => {
        const leftJoined = left.joined_at ? left.joined_at.getTime() : 0;
        const rightJoined = right.joined_at ? right.joined_at.getTime() : 0;
        return leftJoined - rightJoined;
      });

    return {
      id: Number(room.id),
      code: room.code,
      status: room.status,
      host: this.toGuestView(room.host_guest),
      settings: {
        language: {
          id: Number(room.language.id),
          code: room.language.code,
          name: room.language.name,
        },
        difficulty: room.difficulty,
        duration_seconds: room.duration_seconds,
        max_players: room.max_players,
      },
      players: players.map((player) => ({
        id: Number(player.id),
        is_host: String(player.guest.id) === hostId,
        is_ready: player.is_ready,
        joined_at: this.formatTimestamp(player.joined_at),
        guest: this.toGuestView(player.guest),
      })),
      created_at: this.formatTimestamp(room.created_at),
      expires_at: this.formatTimestamp(room.expires_at),
    };
  }

  private toMatchView(match: Match): RoomMatchView {
    return {
      id: Number(match.id),
      status: match.status,
      duration_seconds: match.duration_seconds,
      created_at: this.formatTimestamp(match.created_at),
      starts_at: this.formatTimestamp(match.starts_at),
      ends_at: this.formatTimestamp(match.ends_at),
      completed_at: this.formatTimestamp(match.completed_at),
    };
  }

  private toGuestView(guest: GuestSession): RoomGuestView {
    return {
      id: Number(guest.id),
      nickname: guest.nickname,
    };
  }

  private formatTimestamp(value?: Date | null): string | null {
    if (!value) {
      return null;
    }
    return DateTime.fromJSDate(value).toFormat(TIMESTAMP_FORMAT);
  }

  private isRoomCodeCollision(error: unknown): boolean {
    const violation = this.uniqueViolation(error);
    if (!violation || this.isMembershipCollision(error)) {
      return false;
    }
    return violation.table === 'rooms' || (violation.detail ?? '').includes('(code)=');
  }

  private isMembershipCollision(error: unknown): boolean {
    const violation = this.uniqueViolation(error);
    if (!violation) {
      return false;
    }
    const detail = violation.detail ?? '';
    return (
      violation.table === 'room_players' ||
      (violation.constraint ?? '').includes('room_players') ||
      detail.includes('(room_id, guest_id)=') ||
      detail.includes('(guest_id, room_id)=')
    );
  }

  private uniqueViolation(error: unknown): UniqueViolation | null {
    if (!error || typeof error !== 'object' || !('driverError' in error)) {
      return null;
    }

    const driverError = (error as { driverError?: UniqueViolation & { code?: string } })
      .driverError;
    if (!driverError || driverError.code !== POSTGRES_UNIQUE_VIOLATION) {
      return null;
    }

    return driverError;
  }
}
