import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// supertest publishes a CommonJS export, and this project does not enable esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    // Clean up database
    if (dataSource) {
      await dataSource.dropDatabase();
      await dataSource.destroy();
    }

    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM guest_sessions');
    await dataSource.query('DELETE FROM users');
  });

  describe('/users/me (GET)', () => {
    beforeEach(async () => {
      // Register a user and get access token before each test
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'testuser@example.com',
        password: 'Password123!',
        username: 'testuser',
        display_name: 'Test User',
      });

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it('should get current user profile with valid token', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('email', 'testuser@example.com');
          expect(res.body).toHaveProperty('username', 'testuser');
          expect(res.body).toHaveProperty('display_name', 'Test User');
          expect(res.body).toHaveProperty('created_at');
          expect(typeof res.body.created_at).toBe('number');
          expect(res.body.preferred_language).toBeNull();
          expect(res.body).not.toHaveProperty('password');
          expect(res.body).not.toHaveProperty('password_hash');
        });
    });

    it('should return correct user data structure', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          );
          expect(typeof res.body.email).toBe('string');
          expect(res.body.email).toContain('@');
          expect(typeof res.body.created_at).toBe('number');
          expect(res.body.preferred_language).toBeNull();
        });
    });

    it('should return 401 without authorization header', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 401 without Bearer prefix', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', accessToken)
        .expect(401);
    });

    it('should return 401 with empty token', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });
  });

  describe('Multiple Users', () => {
    it('should return correct user for each token', async () => {
      // Register first user
      const user1Response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'user1@example.com',
        password: 'Password123!',
        username: 'user1',
        display_name: 'User One',
      });

      const user1Token = user1Response.body.access_token;
      const user1Id = user1Response.body.user.id;

      // Register second user
      const user2Response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'user2@example.com',
        password: 'Password456!',
        username: 'user2',
        display_name: 'User Two',
      });

      const user2Token = user2Response.body.access_token;
      const user2Id = user2Response.body.user.id;

      // Get first user's profile
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user1Id);
          expect(res.body.email).toBe('user1@example.com');
        });

      // Get second user's profile
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user2Id);
          expect(res.body.email).toBe('user2@example.com');
        });

      // Verify users are different
      expect(user1Id).not.toBe(user2Id);
    });
  });

  describe('Token Persistence', () => {
    it('should use same token for multiple requests', async () => {
      // Register user
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'persistent@example.com',
        password: 'Password123!',
        username: 'persistent',
        display_name: 'Persistent User',
      });

      const token = response.body.access_token;
      const userId = response.body.user.id;

      // First request
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
        });

      // Second request with same token
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
        });

      // Third request with same token
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
        });
    });
  });

  describe('User Profile After Login', () => {
    it('should access profile after login', async () => {
      // Register user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'logintest@example.com',
        password: 'Password123!',
        username: 'logintest',
        display_name: 'Login Test',
      });

      // Login
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'logintest@example.com',
        password: 'Password123!',
      });

      const loginToken = loginResponse.body.access_token;
      const loginUserId = loginResponse.body.user.id;

      // Get profile with login token
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(loginUserId);
          expect(res.body.email).toBe('logintest@example.com');
        });
    });
  });

  describe('Security', () => {
    it('should not allow access with token from different user', async () => {
      // Register first user
      const user1Response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'user1@example.com',
        password: 'Password123!',
        username: 'secureuser1',
        display_name: 'Secure User One',
      });

      const user1Token = user1Response.body.access_token;

      // Register second user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'user2@example.com',
        password: 'Password456!',
        username: 'secureuser2',
        display_name: 'Secure User Two',
      });

      // Try to access with user1's token
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
        .expect((res) => {
          // Should return user1's data, not user2's
          expect(res.body.email).toBe('user1@example.com');
          expect(res.body.email).not.toBe('user2@example.com');
        });
    });
  });
});
