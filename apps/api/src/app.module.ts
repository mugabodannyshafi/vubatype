import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { GuestModule } from './modules/guest/guest.module';
import { LanguageModule } from './modules/language/language.module';
import { PracticeModule } from './modules/practice/practice.module';
import { RoomModule } from './modules/room/room.module';
import { RaceModule } from './modules/race/race.module';
import { AvatarSeeder } from './database/seeders/avatars.seeder';
import { LanguageSeeder } from './database/seeders/languages.seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    DatabaseModule,
    AuthModule,
    GuestModule,
    LanguageModule,
    PracticeModule,
    RoomModule,
    RaceModule,
  ],
  controllers: [AppController],
  providers: [AppService, LanguageSeeder, AvatarSeeder],
})
export class AppModule {}
