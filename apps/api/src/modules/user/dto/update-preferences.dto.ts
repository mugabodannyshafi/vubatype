import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({ example: 'rw', enum: ['rw', 'en'] })
  @IsString()
  @IsNotEmpty({ message: 'Language is required' })
  @IsIn(['rw', 'en'], { message: 'Language must be Kinyarwanda or English' })
  language_code: string;
}
