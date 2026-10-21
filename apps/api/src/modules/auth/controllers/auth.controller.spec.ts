import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { GuestService } from '../../guest/services/guest.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const mockGuestService = {
    findValidByToken: jest.fn(),
    linkToUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'JWT_EXPIRES_IN') {
        return '1d';
      }
      if (key === 'NODE_ENV') {
        return 'test';
      }
      return defaultValue;
    }),
  };

  const response = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test User',
    password_hash: 'hashedPassword',
  };

  const mockAccessToken = {
    access_token: 'jwt.token.here',
    user: {
      id: mockUser.id,
      email: mockUser.email,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: GuestService,
          useValue: mockGuestService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
        display_name: 'New User',
      };

      mockAuthService.register.mockResolvedValue({
        access_token: 'jwt.token.here',
        user: {
          id: '2',
          email: registerDto.email,
          username: registerDto.username,
          display_name: registerDto.display_name,
        },
      });
      const res = response();

      const result = await controller.register(registerDto, { cookies: {} }, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'auth_session',
        'jwt.token.here',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: false,
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );

      expect(authService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        registerDto.display_name,
      );
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        access_token: 'jwt.token.here',
        user: {
          id: '2',
          email: registerDto.email,
          username: registerDto.username,
          display_name: registerDto.display_name,
        },
      });
    });

    it('links the current guest session to the new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
        display_name: 'New User',
      };
      mockAuthService.register.mockResolvedValue({
        access_token: 'jwt.token.here',
        user: { id: '2', email: registerDto.email, username: 'newuser', display_name: 'New User' },
      });
      mockGuestService.findValidByToken.mockResolvedValue({ id: '9' });

      await controller.register(
        registerDto,
        { cookies: { guest_session: 'guest-token' } },
        response() as any,
      );

      expect(mockGuestService.findValidByToken).toHaveBeenCalledWith('guest-token');
      expect(mockGuestService.linkToUser).toHaveBeenCalledWith('9', '2');
    });

    it('should handle registration errors', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'existing',
        display_name: 'Existing User',
      };

      mockAuthService.register.mockRejectedValue(new Error('User already exists'));

      await expect(controller.register(registerDto, { cookies: {} }, response() as any)).rejects.toThrow(
        'User already exists',
      );
      expect(authService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        registerDto.display_name,
      );
    });
  });

  describe('login', () => {
    it('should login user and return access token', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = {
        user: mockUser,
      };

      mockAuthService.login.mockResolvedValue(mockAccessToken);

      const res = response();

      const result = await controller.login(loginDto, mockRequest, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'auth_session',
        mockAccessToken.access_token,
        expect.objectContaining({ httpOnly: true }),
      );

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAccessToken);
    });

    it('should handle login with invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockRequest = {
        user: null,
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto, mockRequest, response() as any)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('logout', () => {
    it('clears the auth session cookie', () => {
      const res = response();

      controller.logout(res as any);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'auth_session',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const mockRequest = {
        user: {
          id: mockUser.id,
          email: mockUser.email,
        },
      };

      const result = controller.getProfile(mockRequest);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should return complete user object from request', () => {
      const mockRequest = {
        user: {
          id: '3',
          email: 'another@example.com',
          name: 'Test User',
        },
      };

      const result = controller.getProfile(mockRequest);

      expect(result).toEqual(mockRequest.user);
    });
  });
});
