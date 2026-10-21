import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalStatus } from 'src/common/enums/ApprovalStatus';
import { PassageMode } from 'src/common/enums/PassageMode';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { Language } from 'src/database/entities/language.entity';
import { TypingPassage } from 'src/database/entities/typing-passage.entity';
import { RACE_DIFFICULTY_TARGETS } from '../race.config';
import { sentencesFor } from '../race-sentences';
import { composeRaceText } from '../race-text';

export const RACE_PASSAGE_SOURCE = 'race';

export interface GenerateRaceTextInput {
  languageId: string;
  languageCode: string;
  difficulty: WordDifficulty;
}

@Injectable()
export class RaceTextService {
  constructor(
    @InjectRepository(TypingPassage)
    private readonly passageRepository: Repository<TypingPassage>,
  ) {}

  async generate(input: GenerateRaceTextInput): Promise<TypingPassage> {
    const target = RACE_DIFFICULTY_TARGETS[input.difficulty];
    const content = composeRaceText(
      sentencesFor(input.languageCode, input.difficulty),
      target.minWords,
      target.maxWords,
    );
    const passage = this.passageRepository.create({
      language: { id: input.languageId } as Language,
      content,
      mode: PassageMode.SENTENCES,
      difficulty: input.difficulty,
      character_count: content.length,
      source: RACE_PASSAGE_SOURCE,
      approval_status: ApprovalStatus.APPROVED,
    });
    const saved = await this.passageRepository.save(passage);
    const loaded = await this.passageRepository.findOne({
      where: { id: saved.id },
      relations: { language: true },
    });

    if (!loaded) {
      throw new InternalServerErrorException('Generated race passage could not be loaded');
    }

    return loaded;
  }
}
