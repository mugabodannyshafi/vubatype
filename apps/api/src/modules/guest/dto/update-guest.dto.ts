import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { NICKNAME_PATTERN, sanitizeNickname } from './create-guest.dto';

export class UpdateGuestDto {
  @ApiProperty({
    example: 'Quick Lynx',
    description: 'Updated guest nickname',
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
