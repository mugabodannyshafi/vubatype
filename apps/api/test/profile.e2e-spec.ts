/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// supertest publishes a CommonJS export, and this project does not enable esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
// cookie-parser publishes a CommonJS export, and this project does not enable esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { DataSource } from 'typeorm';
import { ApprovalStatus } from '../src/common/enums/ApprovalStatus';
import { PassageMode } from '../src/common/enums/PassageMode';
import { WordDifficulty } from '../src/common/enums/WordDifficulty';
import { AppModule } from '../src/app.module';
import { GuestSession } from '../src/database/entities/guest-session.entity';
import { Language } from '../src/database/entities/language.entity';
import { SoloTypingResult } from '../src/database/entities/solo-typing-result.entity';
import { TypingPassage } from '../src/database/entities/typing-passage.entity';
import { User } from '../src/database/entities/user.entity';

describe('Profile and guest linking (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.dropDatabase();
      await dataSource.destroy();
    }
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM practice_sessions');
    await dataSource.query('DELETE FROM solo_typing_results');
    await dataSource.query('DELETE FROM match_results');
    await dataSource.query('DELETE FROM typing_passages');
    await dataSource.query('DELETE FROM guest_sessions');
    await dataSource.query('DELETE FROM users');
  });

  async function seedResult(guestId: string, netWpm: string) {
    const language = await dataSource.getRepository(Language).findOneByOrFail({ code: 'en' });
    const passage = await dataSource.getRepository(TypingPassage).save({
      language: { id: language.id },
      content: 'hello world',
      mode: PassageMode.RANDOM_WORDS,
      difficulty: WordDifficulty.EASY,
      character_count: 11,
      approval_status: ApprovalStatus.APPROVED,
    });

    await dataSource.getRepository(SoloTypingResult).save({
      guest: { id: guestId },
      passage: { id: passage.id },
      duration_seconds: 30,
      elapsed_time_ms: 30000,
      gross_wpm: netWpm,
      net_wpm: netWpm,
      accuracy: '98.50',
      correct_chars: 11,
      incorrect_chars: 0,
    });
  }

  it('links guest results on register without duplicating them', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

    const guest = await dataSource.getRepository(GuestSession).findOneByOrFail({});
    await seedResult(guest.id, '80.00');

    const registered = await agent
      .post('/auth/register')
      .send({
        email: 'linked@example.com',
        password: 'Password123!',
        username: 'linkeduser',
        display_name: 'Linked User',
      })
      .expect(201);

    const linked = await dataSource.getRepository(GuestSession).findOneOrFail({
      where: { id: guest.id },
      relations: { user: true },
    });
    expect(linked.user?.id).toBe(registered.body.user.id);
    expect(await dataSource.getRepository(SoloTypingResult).count()).toBe(1);

    const progress = await agent.get('/users/me/progress').expect(200);
    expect(progress.body.total_sessions).toBe(1);
    expect(progress.body.personal_best_wpm).toBe(80);
    expect(progress.body.average_accuracy).toBe(98.5);
    expect(progress.body.total_races).toBe(0);
    expect(progress.body.recent).toHaveLength(1);
    expect(progress.body.history).toHaveLength(1);

    const other = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'other@example.com',
        password: 'Password123!',
        username: 'otheruser',
        display_name: 'Other User',
      })
      .expect(201);

    const otherProgress = await request(app.getHttpServer())
      .get('/users/me/progress')
      .set('Authorization', `Bearer ${other.body.access_token}`)
      .expect(200);
    expect(otherProgress.body.total_sessions).toBe(0);

    await agent
      .post('/auth/login')
      .send({ email: 'other@example.com', password: 'Password123!' })
      .expect(200);

    const stillLinked = await dataSource.getRepository(GuestSession).findOneOrFail({
      where: { id: guest.id },
      relations: { user: true },
    });
    expect(stillLinked.user?.id).toBe(registered.body.user.id);
    expect(await dataSource.getRepository(SoloTypingResult).count()).toBe(1);
  });

  it('updates only the signed-in profile, password, and language', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await agent
      .post('/auth/register')
      .send({
        email: 'settings@example.com',
        password: 'Password123!',
        username: 'settingsuser',
        display_name: 'Settings User',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'taken@example.com',
        password: 'Password123!',
        username: 'takenname',
        display_name: 'Taken User',
      })
      .expect(201);

    const updated = await agent
      .patch('/users/me')
      .send({ username: 'renameduser', display_name: 'Renamed User' })
      .expect(200);
    expect(updated.body.username).toBe('renameduser');
    expect(updated.body.display_name).toBe('Renamed User');
    expect(updated.body).not.toHaveProperty('password_hash');

    await agent.patch('/users/me').send({ username: 'takenname' }).expect(409);

    const untouched = await dataSource.getRepository(User).findOneByOrFail({
      email: 'taken@example.com',
    });
    expect(untouched.username).toBe('takenname');
    expect(untouched.display_name).toBe('Taken User');

    await agent
      .patch('/users/me/password')
      .send({ current_password: 'WrongPassword1!', new_password: 'NewPassword123!' })
      .expect(401);
    await agent
      .patch('/users/me/password')
      .send({ current_password: 'Password123!', new_password: 'weak' })
      .expect(400);
    await agent
      .patch('/users/me/password')
      .send({ current_password: 'Password123!', new_password: 'NewPassword123!' })
      .expect(204);

    await agent
      .post('/auth/login')
      .send({ email: 'settings@example.com', password: 'Password123!' })
      .expect(401);
    await agent
      .post('/auth/login')
      .send({ email: 'settings@example.com', password: 'NewPassword123!' })
      .expect(200);

    await agent.patch('/users/me/preferences').send({ language_code: 'fr' }).expect(400);
    const preferences = await agent
      .patch('/users/me/preferences')
      .send({ language_code: 'en' })
      .expect(200);
    expect(preferences.body.preferred_language.code).toBe('en');
    expect(preferences.body.id).toBe(registered.body.user.id);

    await request(app.getHttpServer()).patch('/users/me').send({ display_name: 'Nope' }).expect(401);
    await request(app.getHttpServer()).get('/users/me/progress').expect(401);
  });
});
