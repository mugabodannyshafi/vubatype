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
import { AppModule } from '../src/app.module';
import { GuestSession } from '../src/database/entities/guest-session.entity';

describe('Guests (e2e)', () => {
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
    await dataSource.query('DELETE FROM guest_sessions');
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.dropDatabase();
      await dataSource.destroy();
    }
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM guest_sessions');
  });

  describe('/v1/guests (POST)', () => {
    it('creates a guest session and stores the token in an HttpOnly cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/guests')
        .send({ nickname: '  Swift   Fox  ' })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          nickname: 'Swift Fox',
        }),
      );
      expect(response.body).not.toHaveProperty('session_token_hash');
      expect(response.body).not.toHaveProperty('token');

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toContain('guest_session=');
      expect(setCookie[0].toLowerCase()).toContain('httponly');

      const sessions = await dataSource.getRepository(GuestSession).find();
      const rawToken = setCookie[0].split(';')[0].slice('guest_session='.length);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].session_token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(sessions[0].session_token_hash).not.toBe(rawToken);
    });

    it('restores an existing valid session instead of creating a duplicate', async () => {
      const agent = request.agent(app.getHttpServer());

      const created = await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      const restored = await agent.post('/v1/guests').send({ nickname: 'Quick Lynx' }).expect(200);

      expect(restored.body.id).toBe(created.body.id);
      expect(restored.body.nickname).toBe('Quick Lynx');
      expect(await dataSource.getRepository(GuestSession).count()).toBe(1);
    });

    it('replaces an expired session', async () => {
      const agent = request.agent(app.getHttpServer());
      const created = await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      const repository = dataSource.getRepository(GuestSession);
      const session = await repository.findOne({ where: { id: created.body.id } });
      session.expires_at = new Date(Date.now() - 1000);
      await repository.save(session);

      await agent.get('/v1/guests/me').expect(401);

      const replaced = await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      expect(replaced.body.id).not.toBe(created.body.id);
      expect(await repository.count()).toBe(2);
    });

    it('returns 400 when the nickname is invalid', async () => {
      await request(app.getHttpServer()).post('/v1/guests').send({ nickname: 'a' }).expect(400);
      await request(app.getHttpServer()).post('/v1/guests').send({ nickname: 'bad!' }).expect(400);
      await request(app.getHttpServer())
        .post('/v1/guests')
        .send({ nickname: 'Swift Fox', extra: true })
        .expect(400);
    });
  });

  describe('/v1/guests/me (GET)', () => {
    it('returns 401 when the session cookie is missing', () => {
      return request(app.getHttpServer())
        .get('/v1/guests/me')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Guest session is missing or invalid');
        });
    });

    it('returns the current guest session', async () => {
      const agent = request.agent(app.getHttpServer());
      const created = await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      const current = await agent.get('/v1/guests/me').expect(200);

      expect(current.body.id).toBe(created.body.id);
      expect(current.body.nickname).toBe('Swift Fox');
      expect(current.body).not.toHaveProperty('session_token_hash');
    });
  });

  describe('/v1/guests/me (PATCH)', () => {
    it('updates the guest nickname', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      const updated = await agent
        .patch('/v1/guests/me')
        .send({ nickname: '  Quick   Lynx ' })
        .expect(200);

      expect(updated.body.nickname).toBe('Quick Lynx');
    });

    it('returns 400 for an invalid nickname and 401 without a session', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      await agent.patch('/v1/guests/me').send({ nickname: 'nope!' }).expect(400);
      await request(app.getHttpServer())
        .patch('/v1/guests/me')
        .send({ nickname: 'Quick Lynx' })
        .expect(401);
    });
  });

  describe('/v1/guests/me (DELETE)', () => {
    it('ends the session and rejects later requests', async () => {
      const agent = request.agent(app.getHttpServer());
      const created = await agent.post('/v1/guests').send({ nickname: 'Swift Fox' }).expect(201);

      const ended = await agent.delete('/v1/guests/me').expect(204);

      expect(ended.headers['set-cookie'][0].toLowerCase()).toContain('guest_session=');
      await agent.get('/v1/guests/me').expect(401);

      const session = await dataSource.getRepository(GuestSession).findOne({
        where: { id: created.body.id },
      });
      expect(session).toBeTruthy();
      expect(session.expires_at.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('returns 401 when no guest session exists', () => {
      return request(app.getHttpServer()).delete('/v1/guests/me').expect(401);
    });
  });
});
