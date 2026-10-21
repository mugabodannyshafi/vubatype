import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { GuestModule } from './modules/guest/guest.module';
import { LanguageModule } from './modules/language/language.module';
import { PracticeModule } from './modules/practice/practice.module';
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
  ],
  controllers: [AppController],
  providers: [AppService, LanguageSeeder],
})
export class AppModule {}
