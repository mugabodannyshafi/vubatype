import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApprovalStatus } from 'src/common/enums/ApprovalStatus';
import { WordDifficulty } from 'src/common/enums/WordDifficulty';
import { EntitySeeder } from 'src/common/interfaces/seeder';
import { Language } from 'src/database/entities/language.entity';
import { TypingWord } from 'src/database/entities/typing-word.entity';

const SEED_SOURCE = 'seed';

const SEED_WORDS: Record<string, Record<WordDifficulty, string[]>> = {
  rw: {
    [WordDifficulty.EASY]: [
      'na',
      'mu',
      'ku',
      'ni',
      'se',
      'oya',
      'ubu',
      'ejo',
      'iki',
      'ari',
      'nta',
      'yego',
      'neza',
      'data',
      'mama',
      'inzu',
      'inka',
      'umwe',
      'hehe',
      'bite',
    ],
    [WordDifficulty.MEDIUM]: [
      'amata',
      'abana',
      'ijoro',
      'izuba',
      'akazi',
      'cyane',
      'cyiza',
      'amazi',
      'inyama',
      'umwana',
      'ishuri',
      'umunsi',
      'imvura',
      'muraho',
      'kigali',
      'rwanda',
      'umusozi',
      'inshuti',
      'ikirere',
      'igihugu',
    ],
    [WordDifficulty.HARD]: [
      'murakoze',
      'umwarimu',
      'umukobwa',
      'umuhungu',
      'urukundo',
      'ubumenyi',
      'kwandika',
      'kaminuza',
      'umuryango',
      'umudugudu',
      'umunezero',
      'umuturage',
      'umusaruro',
      'icyumweru',
      'ubutabera',
      'mwaramutse',
      'amafaranga',
      'umunyeshuri',
      'ikinyarwanda',
      'abanyarwanda',
    ],
  },
  en: {
    [WordDifficulty.EASY]: [
      'a',
      'to',
      'of',
      'in',
      'it',
      'is',
      'on',
      'be',
      'we',
      'the',
      'and',
      'you',
      'are',
      'not',
      'day',
      'with',
      'that',
      'this',
      'have',
      'home',
    ],
    [WordDifficulty.MEDIUM]: [
      'water',
      'house',
      'world',
      'happy',
      'green',
      'about',
      'school',
      'friend',
      'people',
      'family',
      'letter',
      'garden',
      'window',
      'market',
      'please',
      'morning',
      'country',
      'teacher',
      'student',
      'village',
    ],
    [WordDifficulty.HARD]: [
      'language',
      'mountain',
      'computer',
      'keyboard',
      'practice',
      'sentence',
      'question',
      'tomorrow',
      'together',
      'children',
      'building',
      'remember',
      'exercise',
      'beautiful',
      'important',
      'yesterday',
      'afternoon',
      'knowledge',
      'community',
      'paragraph',
    ],
  },
};

function difficultyForLength(length: number): WordDifficulty {
  if (length <= 4) {
    return WordDifficulty.EASY;
  }
  if (length <= 7) {
    return WordDifficulty.MEDIUM;
  }
  return WordDifficulty.HARD;
}

@Injectable()
export class TypingWordSeeder implements EntitySeeder {
  async run(db: EntityManager): Promise<void> {
    for (const [code, groups] of Object.entries(SEED_WORDS)) {
      const language = await db.findOne(Language, { where: { code } });
      if (!language) {
        throw new Error(`Cannot seed typing words because language "${code}" is missing`);
      }

      for (const [difficulty, words] of Object.entries(groups) as Array<
        [WordDifficulty, string[]]
      >) {
        for (const word of words) {
          const derived = difficultyForLength(word.length);
          if (derived !== difficulty || word.includes(' ')) {
            throw new Error(`Seed word "${word}" does not match difficulty "${difficulty}"`);
          }

          const existing = await db.findOne(TypingWord, {
            where: {
              word,
              language: { id: language.id },
            },
          });
          if (existing) {
            continue;
          }

          await db.save(
            db.create(TypingWord, {
              language,
              word,
              difficulty,
              character_count: word.length,
              approval_status: ApprovalStatus.APPROVED,
              source: SEED_SOURCE,
            }),
          );
        }
      }
    }

    console.log('Typing words seeded successfully');
  }
}
