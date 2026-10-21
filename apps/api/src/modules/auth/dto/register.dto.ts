import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE } from '../../../common/validation/password';

export class RegisterDto {
  @ApiProperty({
    example: 'jane',
    description: 'Unique username',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(50, { message: 'Username must be at most 50 characters long' })
  username: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Display name',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @MaxLength(100, { message: 'Display name must be at most 100 characters long' })
  display_name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'User password (min 6 characters, at least one uppercase, one lowercase, one number)',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(PASSWORD_PATTERN, {
    message: PASSWORD_PATTERN_MESSAGE,
  })
  password: string;
}
