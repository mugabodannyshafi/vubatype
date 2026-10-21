/// <reference types="jest" />

import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { PassageMode } from 'src/common/enums/PassageMode';
import { RACE_DIFFICULTY_TARGETS } from '../race.config';
import { sentencesFor } from '../race-sentences';
import { composeRaceText, countWords } from '../race-text';
import { RaceTextService } from './race-text.service';

describe('race text', () => {
  const languages = ['en', 'rw'] as const;
  const difficulties = [WordDifficulty.EASY, WordDifficulty.MEDIUM, WordDifficulty.HARD] as const;

  it.each(
    languages.flatMap((language) =>
      difficulties.map((difficulty) => [language, difficulty] as const),
    ),
  )('builds a %s %s passage inside the configured word range', (language, difficulty) => {
    const target = RACE_DIFFICULTY_TARGETS[difficulty];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const content = composeRaceText(
        sentencesFor(language, difficulty),
        target.minWords,
        target.maxWords,
      );
      const words = countWords(content);
      expect(words).toBeGreaterThanOrEqual(target.minWords);
      expect(words).toBeLessThanOrEqual(target.maxWords);
      expect(content).toMatch(/[.!?]["']?$/);
      expect(content.includes(' ')).toBe(true);
    }
  });

  it('uses punctuation in hard passages', () => {
    for (const language of languages) {
      const target = RACE_DIFFICULTY_TARGETS[WordDifficulty.HARD];
      const content = composeRaceText(
        sentencesFor(language, WordDifficulty.HARD),
        target.minWords,
        target.maxWords,
      );
      expect(content).toMatch(/[,;:'"?!]/);
    }
  });

  it('saves one sentence passage for the race', async () => {
    const created: Array<Record<string, unknown>> = [];
    const repository = {
      create: jest.fn((data: Record<string, unknown>) => {
        created.push(data);
        return data;
      }),
      save: jest.fn(async (data: Record<string, unknown>) => ({ ...data, id: '9' })),
      findOne: jest.fn(async () => ({ ...created[0], id: '9' })),
    };
    const service = new RaceTextService(repository as never);

    const passage = await service.generate({
      languageId: '1',
      languageCode: 'rw',
      difficulty: WordDifficulty.EASY,
    });
    const target = RACE_DIFFICULTY_TARGETS[WordDifficulty.EASY];

    expect(passage.mode).toBe(PassageMode.SENTENCES);
    expect(passage.source).toBe('race');
    expect(passage.character_count).toBe((passage.content as string).length);
    expect(countWords(String(passage.content))).toBeGreaterThanOrEqual(target.minWords);
    expect(countWords(String(passage.content))).toBeLessThanOrEqual(target.maxWords);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
