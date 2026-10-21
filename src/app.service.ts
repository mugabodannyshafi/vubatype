import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AvatarSeeder } from './database/seeders/avatars.seeder';
import { LanguageSeeder } from './database/seeders/languages.seeder';
@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    @InjectEntityManager()
    protected readonly db: EntityManager,
    protected readonly languageSeeder: LanguageSeeder,
    protected readonly avatarSeeder: AvatarSeeder,
  ) {}

  getHello(): string {
    return 'Welcome to your NestJS application built with nestify!';
  }

  async onApplicationBootstrap() {
    await this.languageSeeder.run(this.db);
    await this.avatarSeeder.run(this.db);
  }
}
