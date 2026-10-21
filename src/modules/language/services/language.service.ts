import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../../../database/entities/language.entity';

export interface LanguageInfo {
  id: string;
  code: string;
  name: string;
}

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async findAvailable(): Promise<LanguageInfo[]> {
    const languages = await this.languageRepository.find({
      where: { is_active: true },
      order: { id: 'ASC' },
    });

    return languages.map((language) => this.toInfo(language));
  }

  async findAvailableByCode(code: string): Promise<LanguageInfo> {
    const language = await this.languageRepository.findOne({
      where: { code, is_active: true },
    });

    if (!language) {
      throw new NotFoundException(`Language with code "${code}" not found`);
    }

    return this.toInfo(language);
  }

  private toInfo(language: Language): LanguageInfo {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
    };
  }
}
