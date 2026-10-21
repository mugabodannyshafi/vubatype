import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';

export const ROOM_LANGUAGE_CODES = ['rw', 'en'] as const;
export const ROOM_MIN_PLAYERS = 2;
export const ROOM_MAX_PLAYERS = 8;

export class CreateRoomDto {
  @ApiProperty({ example: 'rw', enum: ROOM_LANGUAGE_CODES })
  @IsString()
  @IsIn(ROOM_LANGUAGE_CODES)
  language_code: string;

  @ApiProperty({ enum: WordDifficulty, example: WordDifficulty.EASY })
  @IsEnum(WordDifficulty)
  difficulty: WordDifficulty;

  @ApiProperty({ example: 8, minimum: ROOM_MIN_PLAYERS, maximum: ROOM_MAX_PLAYERS })
  @IsInt()
  @Min(ROOM_MIN_PLAYERS)
  @Max(ROOM_MAX_PLAYERS)
  max_players: number;
}
