import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_PATTERN_MESSAGE } from '../../../common/validation/password';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  @MinLength(6, { message: 'Current password must be at least 6 characters long' })
  current_password: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'New password (min 6 characters, uppercase, lowercase, and number or special character)',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  new_password: string;
}
