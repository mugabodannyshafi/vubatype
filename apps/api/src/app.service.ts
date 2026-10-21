import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AvatarSeeder } from './database/seeders/avatars.seeder';
import { LanguageSeeder } from './database/seeders/languages.seeder';
import { TypingWordSeeder } from './database/seeders/typing-words.seeder';
@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @InjectEntityManager()
    protected readonly db: EntityManager,
    protected readonly languageSeeder: LanguageSeeder,
    protected readonly avatarSeeder: AvatarSeeder,
    protected readonly typingWordSeeder: TypingWordSeeder,
  ) {}

  getHello(): string {
    return 'Welcome to your NestJS application built with nestify!';
  }

  async onApplicationBootstrap() {
    await this.languageSeeder.run(this.db);
    await this.typingWordSeeder.run(this.db);
    await this.avatarSeeder.run(this.db);
  }
}
