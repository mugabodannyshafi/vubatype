import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsString } from 'class-validator';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';

export const PRACTICE_LANGUAGE_CODES = ['rw', 'en'] as const;
export const PRACTICE_DURATIONS = [15, 30, 60] as const;

export class StartPracticeSessionDto {
  @ApiProperty({ example: 'en', enum: PRACTICE_LANGUAGE_CODES })
  @IsString()
  @IsIn(PRACTICE_LANGUAGE_CODES)
  language_code: string;

  @ApiProperty({ enum: WordDifficulty, example: WordDifficulty.EASY })
  @IsEnum(WordDifficulty)
  difficulty: WordDifficulty;

  @ApiProperty({ example: 30, enum: PRACTICE_DURATIONS })
  @IsInt()
  @IsIn(PRACTICE_DURATIONS)
  duration_seconds: number;
}
