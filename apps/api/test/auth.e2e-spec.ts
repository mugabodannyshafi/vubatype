import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// supertest publishes a CommonJS export, and this project does not enable esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
// cookie-parser publishes a CommonJS export, and this project does not enable esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

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

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          username: 'newuser',
          display_name: 'New User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email', 'newuser@example.com');
          expect(res.body.user).toHaveProperty('username', 'newuser');
          expect(res.body.user).toHaveProperty('display_name', 'New User');
          expect(res.body.user).not.toHaveProperty('password');
          expect(res.body.user).not.toHaveProperty('password_hash');
          const setCookie = res.headers['set-cookie'];
          expect(setCookie).toBeDefined();
          expect(String(setCookie).toLowerCase()).toContain('auth_session=');
          expect(String(setCookie).toLowerCase()).toContain('httponly');
        });
    });

    it('should return 409 when registering with existing email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        username: 'duplicate',
        display_name: 'Duplicate User',
      };

      // First registration
      await request(app.getHttpServer()).post('/auth/register').send(userData).expect(201);

      // Second registration with same email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          username: 'invalid',
          display_name: 'Invalid User',
        })
        .expect(400);
    });

    it('should return 400 when password is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          display_name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 when request body is empty', () => {
      return request(app.getHttpServer()).post('/auth/register').send({}).expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Register a user before each login test
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'loginuser@example.com',
        password: 'Password123!',
        username: 'loginuser',
        display_name: 'Login User',
      });

      userId = response.body.user.id;
    });

    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id', userId);
          expect(res.body.user).toHaveProperty('email', 'loginuser@example.com');
          expect(res.body.user).toHaveProperty('username', 'loginuser');
          expect(res.body.user).toHaveProperty('display_name', 'Login User');
          expect(res.body.user).not.toHaveProperty('password');
          expect(res.body.user).not.toHaveProperty('password_hash');
          accessToken = res.body.access_token;
        });
    });

    it('should return 401 with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should return 401 with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    beforeEach(async () => {
      // Register and login to get access token
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'profileuser@example.com',
        password: 'Password123!',
        username: 'profileuser',
        display_name: 'Profile User',
      });

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('email', 'profileuser@example.com');
          expect(res.body).not.toHaveProperty('password');
          expect(res.body).not.toHaveProperty('password_hash');
        });
    });

    it('should return 401 without authorization header', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature')
        .expect(401);
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      const userEmail = 'flowtest@example.com';
      const userPassword = 'Password123!';

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: userPassword,
          username: 'flowtest',
          display_name: 'Flow Test',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('access_token');
      const registerToken = registerResponse.body.access_token;
      const registeredUserId = registerResponse.body.user.id;

      // 2. Get profile with registration token
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(registeredUserId);
          expect(res.body.email).toBe(userEmail);
        });

      // 3. Login with same credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      const loginToken = loginResponse.body.access_token;

      // 4. Get profile with login token
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(registeredUserId);
          expect(res.body.email).toBe(userEmail);
        });
    });
  });

  describe('/auth/logout (POST)', () => {
    it('clears the auth session cookie and keeps bearer login working', async () => {
      const agent = request.agent(app.getHttpServer());
      const registered = await agent
        .post('/auth/register')
        .send({
          email: 'cookieuser@example.com',
          password: 'Password123!',
          username: 'cookieuser',
          display_name: 'Cookie User',
        })
        .expect(201);

      await agent.get('/users/me').expect(200).expect((res) => {
        expect(res.body.email).toBe('cookieuser@example.com');
      });

      const logout = await agent.post('/auth/logout').expect(204);
      expect(String(logout.headers['set-cookie']).toLowerCase()).toContain('auth_session=');

      await agent.get('/users/me').expect(401);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${registered.body.access_token}`)
        .expect(200);
    });
  });
});
