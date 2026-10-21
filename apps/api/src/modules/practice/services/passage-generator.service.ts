import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalStatus } from 'src/common/enums/ApprovalStatus';
import { PassageMode } from 'src/common/enums/PassageMode';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { Language } from 'src/database/entities/language.entity';
import { TypingPassage } from 'src/database/entities/typing-passage.entity';
import { TypingWord } from 'src/database/entities/typing-word.entity';

export const PRACTICE_PASSAGE_SOURCE = 'practice';
const TARGET_WPM = 300;
const CHARS_PER_WORD = 5;

export interface GeneratePassageInput {
  languageId: string;
  difficulty: WordDifficulty;
  durationSeconds: number;
  source?: string;
}

@Injectable()
export class PassageGeneratorService {
  constructor(
    @InjectRepository(TypingWord)
    private readonly wordRepository: Repository<TypingWord>,
    @InjectRepository(TypingPassage)
    private readonly passageRepository: Repository<TypingPassage>,
  ) {}

  async generate(input: GeneratePassageInput): Promise<TypingPassage> {
    const words = await this.wordRepository.find({
      where: {
        language: { id: input.languageId },
        difficulty: input.difficulty,
        approval_status: ApprovalStatus.APPROVED,
      },
    });

    if (words.length === 0) {
      throw new BadRequestException(
        'No approved words are available for this language and difficulty',
      );
    }

    const content = this.buildContent(words, this.targetCharacters(input.durationSeconds));
    const passage = this.passageRepository.create({
      language: { id: input.languageId } as Language,
      content,
      mode: PassageMode.RANDOM_WORDS,
      difficulty: input.difficulty,
      character_count: content.length,
      source: input.source ?? PRACTICE_PASSAGE_SOURCE,
      approval_status: ApprovalStatus.APPROVED,
    });
    const saved = await this.passageRepository.save(passage);
    const loaded = await this.passageRepository.findOne({
      where: { id: saved.id },
      relations: { language: true },
    });

    if (!loaded) {
      throw new InternalServerErrorException('Generated passage could not be loaded');
    }

    return loaded;
  }

  private targetCharacters(durationSeconds: number): number {
    return Math.ceil(TARGET_WPM * CHARS_PER_WORD * (durationSeconds / 60));
  }

  private buildContent(words: TypingWord[], targetCharacters: number): string {
    const selected: string[] = [];
    let contentLength = 0;
    let pool = this.shuffle(words);
    let poolIndex = 0;

    while (contentLength < targetCharacters) {
      if (poolIndex >= pool.length) {
        pool = this.shuffle(words);
        poolIndex = 0;
      }

      const word = pool[poolIndex].word;
      poolIndex += 1;
      contentLength += word.length + (selected.length > 0 ? 1 : 0);
      selected.push(word);
    }

    return selected.join(' ');
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = current;
    }
    return copy;
  }
}
