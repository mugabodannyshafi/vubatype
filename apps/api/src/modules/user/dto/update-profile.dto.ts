import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'jane', maxLength: 50 })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(50, { message: 'Username must be at most 50 characters long' })
  username?: string;

  @ApiPropertyOptional({ example: 'Jane Doe', maxLength: 100 })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @MaxLength(100, { message: 'Display name must be at most 100 characters long' })
  display_name?: string;
}
