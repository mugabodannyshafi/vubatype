import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserProgressService } from '../services/user-progress.service';
import { AvatarStorageService } from '../services/avatar-storage.service';
import { UserService } from '../services/user.service';
import { LanguageService } from '../../language/services/language.service';
import { UserStatus } from '../../../common/enums/UserStatus';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let progressService: UserProgressService;

  const mockUserService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    updatePreferredLanguage: jest.fn(),
  };

  const mockProgressService = {
    getProgress: jest.fn(),
  };

  const mockLanguageService = {
    findAvailableByCode: jest.fn(),
  };

  const mockUser = {
    id: 'b1bf6d86-afee-43d1-8a3f-d13fe3147824',
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test User',
    password_hash: '$2b$10$jEEstRcnSFaYO/JOao.zfeUzB7spE9p/YN5FWnw2aL24UT0jCL4ze',
    avatar_url: null,
    preferred_language: null,
    created_at: 1760000000,
    updated_at: 1760000000,
    status: UserStatus.ACTIVE,
  };

  const publicUser = {
    id: mockUser.id,
    email: mockUser.email,
    username: mockUser.username,
    display_name: mockUser.display_name,
    avatar_url: null,
    preferred_language: null,
    created_at: mockUser.created_at,
    updated_at: mockUser.updated_at,
    status: mockUser.status,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: UserProgressService, useValue: mockProgressService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: AvatarStorageService, useValue: { upload: jest.fn(), remove: jest.fn() } },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
    progressService = module.get<UserProgressService>(UserProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return the current user without the password hash', async () => {
      const mockRequest = { user: { id: mockUser.id, email: mockUser.email } };
      mockUserService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockRequest);

      expect(userService.getProfile).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(publicUser);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should include the preferred language', async () => {
      const mockRequest = { user: { id: mockUser.id } };
      mockUserService.getProfile.mockResolvedValue({
        ...mockUser,
        preferred_language: { id: '2', code: 'en', name: 'English' },
      });

      const result = await controller.getCurrentUser(mockRequest);

      expect(result.preferred_language).toEqual({ id: 2, code: 'en', name: 'English' });
    });

    it('should return null when the user is not found', async () => {
      mockUserService.getProfile.mockResolvedValue(null);

      const result = await controller.getCurrentUser({ user: { id: 'missing' } });

      expect(result).toBeNull();
    });
  });

  describe('updateCurrentUser', () => {
    it('updates only the authenticated user', async () => {
      mockUserService.updateProfile.mockResolvedValue({
        ...mockUser,
        username: 'renamed',
        display_name: 'Renamed',
      });

      const result = await controller.updateCurrentUser(
        { username: 'renamed', display_name: 'Renamed' },
        { user: { id: mockUser.id } },
      );

      expect(userService.updateProfile).toHaveBeenCalledWith(mockUser.id, {
        username: 'renamed',
        display_name: 'Renamed',
      });
      expect(result.username).toBe('renamed');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('changePassword', () => {
    it('changes the password for the authenticated user', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(
        { current_password: 'Password123!', new_password: 'NewPassword123!' },
        { user: { id: mockUser.id } },
      );

      expect(userService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        'Password123!',
        'NewPassword123!',
      );
    });
  });

  describe('updatePreferences', () => {
    it('saves an active language for the authenticated user', async () => {
      mockLanguageService.findAvailableByCode.mockResolvedValue({
        id: 2,
        code: 'en',
        name: 'English',
      });
      mockUserService.updatePreferredLanguage.mockResolvedValue({
        ...mockUser,
        preferred_language: { id: '2', code: 'en', name: 'English' },
      });

      const result = await controller.updatePreferences(
        { language_code: 'en' },
        { user: { id: mockUser.id } },
      );

      expect(mockLanguageService.findAvailableByCode).toHaveBeenCalledWith('en');
      expect(userService.updatePreferredLanguage).toHaveBeenCalledWith(mockUser.id, '2');
      expect(result.preferred_language).toEqual({ id: 2, code: 'en', name: 'English' });
    });
  });

  describe('getProgress', () => {
    it('loads progress for the authenticated user only', async () => {
      const progress = {
        personal_best_wpm: 80,
        average_wpm: 70,
        average_accuracy: 96,
        total_sessions: 2,
        total_races: 0,
        recent: [],
        history: [],
      };
      mockProgressService.getProgress.mockResolvedValue(progress);

      const result = await controller.getProgress({ user: { id: mockUser.id } });

      expect(progressService.getProgress).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(progress);
    });
  });
});
