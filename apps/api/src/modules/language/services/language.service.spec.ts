import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../../../database/entities/language.entity';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let repository: Repository<Language>;

  const mockLanguageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const kinyarwanda = {
    id: '1',
    code: 'rw',
    name: 'Kinyarwanda',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  const english = {
    id: '2',
    code: 'en',
    name: 'English',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        {
          provide: getRepositoryToken(Language),
          useValue: mockLanguageRepository,
        },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
    repository = module.get<Repository<Language>>(getRepositoryToken(Language));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAvailable', () => {
    it('should return active languages as id, code, and name', async () => {
      mockLanguageRepository.find.mockResolvedValue([kinyarwanda, english]);

      const result = await service.findAvailable();

      expect(repository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { id: 'ASC' },
      });
      expect(result).toEqual([
        { id: 1, code: 'rw', name: 'Kinyarwanda' },
        { id: 2, code: 'en', name: 'English' },
      ]);
    });
  });

  describe('findAvailableByCode', () => {
    it('should return language information for an active code', async () => {
      mockLanguageRepository.findOne.mockResolvedValue(english);

      const result = await service.findAvailableByCode('en');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'en', is_active: true },
      });
      expect(result).toEqual({ id: 2, code: 'en', name: 'English' });
    });

    it('should throw NotFoundException when the code is missing', async () => {
      mockLanguageRepository.findOne.mockResolvedValue(null);

      await expect(service.findAvailableByCode('fr')).rejects.toThrow(NotFoundException);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'fr', is_active: true },
      });
    });
  });
});
