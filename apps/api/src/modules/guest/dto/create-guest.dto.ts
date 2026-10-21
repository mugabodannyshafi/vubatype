import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const NICKNAME_PATTERN = /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/;

export function sanitizeNickname(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ');
}

export class CreateGuestDto {
  @ApiProperty({
    example: 'Swift Fox',
    description: 'Guest nickname',
    minLength: 2,
    maxLength: 20,
  })
  @Transform(({ value }) => sanitizeNickname(value))
  @IsString()
  @IsNotEmpty({ message: 'Nickname is required' })
  @MinLength(2, { message: 'Nickname must be at least 2 characters long' })
  @MaxLength(20, { message: 'Nickname must be at most 20 characters long' })
  @Matches(NICKNAME_PATTERN, {
    message: 'Nickname may contain letters, numbers, spaces, hyphens, and underscores',
  })
  nickname: string;
}
