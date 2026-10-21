/// <reference types="jest" />

jest.mock('@nestjs/common', () => {
  class UnauthorizedException extends Error {
    constructor(message?: string) {
      super(message);
      this.name = 'UnauthorizedException';
    }
  }

  const decorator = () => () => undefined;

  return {
    Injectable: () => (target: unknown) => target,
    Controller: decorator,
    Post: decorator,
    Get: decorator,
    Patch: decorator,
    Delete: decorator,
    Body: decorator,
    Request: decorator,
    Res: decorator,
    UseGuards: decorator,
    HttpCode: decorator,
    HttpStatus: {
      CREATED: 201,
      OK: 200,
      NO_CONTENT: 204,
    },
    UnauthorizedException,
  };
});

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('@nestjs/swagger', () => {
  const decorator = () => () => undefined;
  return {
    ApiCookieAuth: decorator,
    ApiOperation: decorator,
    ApiResponse: decorator,
    ApiTags: decorator,
    ApiProperty: decorator,
  };
});

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GuestAuthGuard } from '../../../common/guards/guest-auth.guard';
import { GuestController } from './guest.controller';
import { GuestService } from '../services/guest.service';

describe('GuestController', () => {
  let controller: GuestController;

  const expiresAt = new Date(Date.now() + 60_000);
  const guestProfile = {
    id: '1',
    nickname: 'Swift Fox',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    expires_at: expiresAt,
    last_seen_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockGuestService = {
    createOrRestore: jest.fn(),
    updateNickname: jest.fn(),
    endSession: jest.fn(),
    toProfile: jest.fn(),
    findValidByToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    mockConfigService.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'development' : undefined,
    );

    controller = new GuestController(mockGuestService as never, mockConfigService as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('sets an HttpOnly cookie when a session is created', async () => {
      mockGuestService.createOrRestore.mockResolvedValue({
        guest: guestProfile,
        created: true,
        token: 'raw-token',
      });
      const res = {
        cookie: jest.fn(),
        status: jest.fn(),
        clearCookie: jest.fn(),
      };

      const result = await controller.create(
        { nickname: 'Swift Fox' },
        { cookies: {} },
        res as any,
      );

      expect(mockGuestService.createOrRestore).toHaveBeenCalledWith('Swift Fox', undefined);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.cookie).toHaveBeenCalledWith(
        'guest_session',
        'raw-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: false,
          maxAge: expect.any(Number),
        }),
      );
      expect(result).toEqual(guestProfile);
      expect(result).not.toHaveProperty('session_token_hash');
    });

    it('sets a secure cookie in production', async () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'production' : undefined,
      );
      mockGuestService.createOrRestore.mockResolvedValue({
        guest: guestProfile,
        created: true,
        token: 'raw-token',
      });
      const res = { cookie: jest.fn(), status: jest.fn() };

      await controller.create({ nickname: 'Swift Fox' }, { cookies: {} }, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'guest_session',
        'raw-token',
        expect.objectContaining({ secure: true }),
      );
    });

    it('restores an existing session without replacing the cookie', async () => {
      mockGuestService.createOrRestore.mockResolvedValue({
        guest: { ...guestProfile, nickname: 'Quick Lynx' },
        created: false,
      });
      const res = { cookie: jest.fn(), status: jest.fn() };

      const result = await controller.create(
        { nickname: 'Quick Lynx' },
        { cookies: { guest_session: 'raw-token' } },
        res as any,
      );

      expect(mockGuestService.createOrRestore).toHaveBeenCalledWith('Quick Lynx', 'raw-token');
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(result.nickname).toBe('Quick Lynx');
    });
  });

  describe('getCurrentGuest', () => {
    it('returns the current guest profile', () => {
      const guest = { id: '1', nickname: 'Swift Fox' };
      mockGuestService.toProfile.mockReturnValue(guestProfile);

      const result = controller.getCurrentGuest({ guest });

      expect(mockGuestService.toProfile).toHaveBeenCalledWith(guest);
      expect(result).toEqual(guestProfile);
    });
  });

  describe('updateCurrentGuest', () => {
    it('updates the nickname for the current guest', async () => {
      const guest = { id: '1' };
      mockGuestService.updateNickname.mockResolvedValue({
        ...guestProfile,
        nickname: 'Quick Lynx',
      });

      const result = await controller.updateCurrentGuest({ nickname: 'Quick Lynx' }, { guest });

      expect(mockGuestService.updateNickname).toHaveBeenCalledWith(guest, 'Quick Lynx');
      expect(result.nickname).toBe('Quick Lynx');
    });
  });

  describe('endCurrentGuest', () => {
    it('expires the session and clears the cookie', async () => {
      const guest = { id: '1' };
      const res = { clearCookie: jest.fn() };
      mockGuestService.endSession.mockResolvedValue(undefined);

      await controller.endCurrentGuest({ guest }, res as any);

      expect(mockGuestService.endSession).toHaveBeenCalledWith(guest);
      expect(res.clearCookie).toHaveBeenCalledWith(
        'guest_session',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: false,
        }),
      );
    });
  });
});

describe('GuestAuthGuard', () => {
  const mockGuestService = {
    findValidByToken: jest.fn(),
  };

  const guard = new GuestAuthGuard(mockGuestService as unknown as GuestService);

  const contextFor = (cookies: Record<string, string> | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => {
          const request: { cookies?: Record<string, string>; guest?: unknown } = { cookies };
          return request;
        },
      }),
    }) as ExecutionContext;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a missing session', async () => {
    await expect(guard.canActivate(contextFor(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mockGuestService.findValidByToken).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired session', async () => {
    mockGuestService.findValidByToken.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ guest_session: 'expired-token' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches a valid guest to the request', async () => {
    const guest = { id: '1', nickname: 'Swift Fox' };
    mockGuestService.findValidByToken.mockResolvedValue(guest);
    const request: { cookies?: Record<string, string>; guest?: unknown } = {
      cookies: { guest_session: 'raw-token' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.guest).toBe(guest);
  });
});
