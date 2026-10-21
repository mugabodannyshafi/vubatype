import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export const MAX_TYPED_TEXT_LENGTH = 4000;

export class FinishPracticeSessionDto {
  @ApiProperty({
    description:
      'Characters submitted for the stored passage. The server calculates speed, accuracy, and elapsed time.',
    example: 'muraho world',
  })
  @IsString()
  @MaxLength(MAX_TYPED_TEXT_LENGTH)
  typed_text: string;
}
