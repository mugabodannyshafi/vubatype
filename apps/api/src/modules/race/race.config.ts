import { WordDifficulty } from 'src/common/enums/WordDifficulty';

export interface RaceDifficultyTarget {
  minWords: number;
  maxWords: number;
  maxSeconds: number;
}

export const RACE_DIFFICULTY_TARGETS: Record<WordDifficulty, RaceDifficultyTarget> = {
  [WordDifficulty.EASY]: { minWords: 20, maxWords: 35, maxSeconds: 60 },
  [WordDifficulty.MEDIUM]: { minWords: 40, maxWords: 65, maxSeconds: 90 },
  [WordDifficulty.HARD]: { minWords: 70, maxWords: 100, maxSeconds: 150 },
};

export function raceDurationSeconds(difficulty: WordDifficulty): number {
  return RACE_DIFFICULTY_TARGETS[difficulty].maxSeconds;
}
