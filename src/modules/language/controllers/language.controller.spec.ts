import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LanguageController } from './language.controller';
import { LanguageService } from '../services/language.service';

describe('LanguageController', () => {
  let controller: LanguageController;
  let languageService: LanguageService;

  const mockLanguageService = {
    findAvailable: jest.fn(),
    findAvailableByCode: jest.fn(),
  };

  const languages = [
    { id: '1', code: 'rw', name: 'Kinyarwanda' },
    { id: '2', code: 'en', name: 'English' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguageController],
      providers: [
        {
          provide: LanguageService,
          useValue: mockLanguageService,
        },
      ],
    }).compile();

    controller = module.get<LanguageController>(LanguageController);
    languageService = module.get<LanguageService>(LanguageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAvailable', () => {
    it('should return available typing languages', async () => {
      mockLanguageService.findAvailable.mockResolvedValue(languages);

      const result = await controller.findAvailable();

      expect(languageService.findAvailable).toHaveBeenCalledTimes(1);
      expect(result).toEqual(languages);
    });
  });

  describe('findByCode', () => {
    it('should return language information for a code', async () => {
      mockLanguageService.findAvailableByCode.mockResolvedValue(languages[1]);

      const result = await controller.findByCode('en');

      expect(languageService.findAvailableByCode).toHaveBeenCalledWith('en');
      expect(result).toEqual({ id: '2', code: 'en', name: 'English' });
    });

    it('should throw NotFoundException when the code is missing', async () => {
      mockLanguageService.findAvailableByCode.mockRejectedValue(
        new NotFoundException('Language with code "fr" not found'),
      );

      await expect(controller.findByCode('fr')).rejects.toThrow(NotFoundException);
      expect(languageService.findAvailableByCode).toHaveBeenCalledWith('fr');
    });
  });
});
