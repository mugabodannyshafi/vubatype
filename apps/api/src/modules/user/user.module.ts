import { Module } from '@nestjs/common';
import { AvatarStorageService } from './services/avatar-storage.service';
import { UserService } from './services/user.service';
import { UserProgressService } from './services/user-progress.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchResult } from '../../database/entities/match-result.entity';
import { SoloTypingResult } from '../../database/entities/solo-typing-result.entity';
import { User } from '../../database/entities/user.entity';
import { LanguageModule } from '../language/language.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, SoloTypingResult, MatchResult]), LanguageModule],
  controllers: [UserController],
  providers: [UserService, UserProgressService, AvatarStorageService],
  exports: [UserService],
})
export class UserModule {}
