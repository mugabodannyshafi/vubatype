import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeSession } from 'src/database/entities/practice-session.entity';
import { SoloTypingResult } from 'src/database/entities/solo-typing-result.entity';
import { TypingPassage } from 'src/database/entities/typing-passage.entity';
import { TypingWord } from 'src/database/entities/typing-word.entity';
import { GuestModule } from '../guest/guest.module';
import { LanguageModule } from '../language/language.module';
import { PracticeController } from './controllers/practice.controller';
import { PassageGeneratorService } from './services/passage-generator.service';
import { PracticeService } from './services/practice.service';
import { TypingScoreService } from './services/typing-score.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PracticeSession, TypingPassage, TypingWord, SoloTypingResult]),
    GuestModule,
    LanguageModule,
  ],
  controllers: [PracticeController],
  providers: [PracticeService, PassageGeneratorService, TypingScoreService],
  exports: [PassageGeneratorService, TypingScoreService],
})
export class PracticeModule {}
