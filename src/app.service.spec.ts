import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { AvatarSeeder } from './database/seeders/avatars.seeder';
import { LanguageSeeder } from './database/seeders/languages.seeder';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        LanguageSeeder,
        AvatarSeeder,
        {
          provide: getEntityManagerToken(),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return welcome message', () => {
      expect(service.getHello()).toBe('Welcome to your NestJS application built with nestify!');
    });

    it('should return a string', () => {
      const result = service.getHello();
      expect(typeof result).toBe('string');
    });

    it('should contain nestify', () => {
      const result = service.getHello();
      expect(result).toContain('nestify');
    });
  });
});
