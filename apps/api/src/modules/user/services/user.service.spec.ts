import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { User } from '../../../database/entities/user.entity';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUser = {
    id: 'b1bf6d86-afee-43d1-8a3f-d13fe3147824',
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test User',
    password_hash: '$2b$10$jEEstRcnSFaYO/JOao.zfeUzB7spE9p/YN5FWnw2aL24UT0jCL4ze',
    createdAt: new Date('2025-10-09T15:18:29.155Z'),
    updatedAt: new Date('2025-10-09T15:18:29.155Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(repository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });

      expect(result).toBeNull();
    });

    it('should handle different email formats', async () => {
      const emails = ['user@example.com', 'test.user@domain.co.uk', 'name+tag@example.org'];

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      for (const email of emails) {
        await service.findByEmail(email);
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { email },
        });
      }

      expect(repository.findOne).toHaveBeenCalledTimes(emails.length);
    });

    it('should handle database errors', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        'Database connection failed',
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        display_name: 'New User',
        password_hash: '$2b$10$hashedPassword',
      };

      const createdUser = {
        ...userData,
        id: 'c2cf7e97-bfff-54e2-9b4g-e24gf4258935',
        createdAt: new Date('2025-10-09T15:18:29.155Z'),
        updatedAt: new Date('2025-10-09T15:18:29.155Z'),
      };

      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(createdUser);

      expect(result).toEqual(createdUser);
    });

    it('should create user with only required fields', async () => {
      const userData = {
        email: 'minimal@example.com',
        username: 'minimal',
        display_name: 'Minimal User',
        password_hash: '$2b$10$anotherHash',
      };

      mockUserRepository.create.mockReturnValue(userData);
      mockUserRepository.save.mockResolvedValue({
        ...userData,
        id: 'd3d3d3d3-3333-3333-3333-333333333333',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(userData);

      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.create).toHaveBeenCalledWith({
        email: expect.any(String),
        username: expect.any(String),
        display_name: expect.any(String),
        password_hash: expect.any(String),
      });
    });

    it('should handle save errors', async () => {
      const userData = {
        email: 'error@example.com',
        username: 'erroruser',
        display_name: 'Error User',
        password_hash: '$2b$10$hash',
      };

      mockUserRepository.create.mockReturnValue(userData);
      mockUserRepository.save.mockRejectedValue(new Error('Duplicate key error'));

      await expect(service.create(userData)).rejects.toThrow('Duplicate key error');
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should properly hash and store password', async () => {
      const userData = {
        email: 'secure@example.com',
        username: 'secure',
        display_name: 'Secure User',
        password_hash: '$2b$10$jEEstRcnSFaYO/JOao.zfeUzB7spE9p/YN5FWnw2aL24UT0jCL4ze',
      };

      const savedUser = {
        ...userData,
        id: 'e4e4e4e4-4444-4444-4444-444444444444',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(userData);

      expect(result.password_hash).toBe(userData.password_hash);
      expect(result.password_hash).toMatch(/^\$2b\$/);
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('b1bf6d86-afee-43d1-8a3f-d13fe3147824');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'b1bf6d86-afee-43d1-8a3f-d13fe3147824' },
      });
      expect(repository.findOne).toHaveBeenCalledTimes(1);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent-uuid' },
      });

      expect(result).toBeNull();
    });

    it('should handle different UUID formats', async () => {
      const uuids = [
        'a1a1a1a1-1111-1111-1111-111111111111',
        'b2b2b2b2-2222-2222-2222-222222222222',
        'c3c3c3c3-3333-3333-3333-333333333333',
      ];

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      for (const uuid of uuids) {
        await service.findById(uuid);
        expect(repository.findOne).toHaveBeenCalledWith({
          where: { id: uuid },
        });
      }

      expect(repository.findOne).toHaveBeenCalledTimes(uuids.length);
    });

    it('should handle database errors when finding by id', async () => {
      mockUserRepository.findOne.mockRejectedValue(new Error('Database timeout'));

      await expect(service.findById('b1bf6d86-afee-43d1-8a3f-d13fe3147824')).rejects.toThrow(
        'Database timeout',
      );
    });

    it('should return complete user object with all fields', async () => {
      const completeUser = {
        id: 'f5f5f5f5-5555-5555-5555-555555555555',
        email: 'complete@example.com',
        username: 'complete',
        display_name: 'Complete User',
        password_hash: '$2b$10$completeHash',
        createdAt: new Date('2025-10-09T15:18:29.155Z'),
        updatedAt: new Date('2025-10-09T16:30:45.678Z'),
      };

      mockUserRepository.findOne.mockResolvedValue(completeUser);

      const result = await service.findById('f5f5f5f5-5555-5555-5555-555555555555');

      expect(result).toEqual(completeUser);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('password_hash');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('display_name');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('updateProfile', () => {
    it('rejects a username that belongs to someone else', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce({ ...mockUser, id: 'other-user' });

      await expect(service.updateProfile(mockUser.id, { username: 'taken' })).rejects.toThrow(
        ConflictException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('updates the display name for the same user', async () => {
      const updated = { ...mockUser, display_name: 'Renamed' };
      mockUserRepository.findOne.mockResolvedValue(updated);
      mockUserRepository.save.mockResolvedValue(updated);

      const result = await service.updateProfile(mockUser.id, { display_name: 'Renamed' });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'Renamed' }),
      );
      expect(result?.display_name).toBe('Renamed');
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(mockUser.id, 'wrong', 'NewPassword123!')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('stores a new hash when the current password matches', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      await service.changePassword(mockUser.id, 'Password123!', 'NewPassword123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password_hash: 'new-hash' }),
      );
    });
  });

  describe('updatePreferredLanguage', () => {
    it('stores the language for that user and reloads the profile', async () => {
      const saved = {
        ...mockUser,
        preferred_language: { id: '2', code: 'en', name: 'English' },
      };
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue(saved);
      mockUserRepository.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce(saved);

      const result = await service.updatePreferredLanguage(mockUser.id, '2');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          preferred_language: { id: '2' },
        }),
      );
      expect(result?.preferred_language).toEqual(saved.preferred_language);
    });
  });
});
