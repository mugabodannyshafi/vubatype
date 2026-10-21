import type { RaceDifficulty } from "@/lib/api/rooms";

export const RACE_LIMITS: Record<RaceDifficulty, { minWords: number; maxWords: number; maxSeconds: number }> = {
  easy: { minWords: 20, maxWords: 35, maxSeconds: 60 },
  medium: { minWords: 40, maxWords: 65, maxSeconds: 90 },
  hard: { minWords: 70, maxWords: 100, maxSeconds: 150 },
};

export function correctPrefixLength(passage: string, typedText: string): number {
  const limit = Math.min(passage.length, typedText.length);
  let index = 0;
  while (index < limit && passage[index] === typedText[index]) {
    index += 1;
  }
  return index;
}

export function scoreRaceTyping(passage: string, typedText: string, elapsedMs: number) {
  const prefix = correctPrefixLength(passage, typedText);
  const comparedLength = Math.min(typedText.length, passage.length);
  let correctChars = 0;
  let incorrectChars = 0;

  for (let index = 0; index < comparedLength; index += 1) {
    if (typedText[index] === passage[index]) {
      correctChars += 1;
    } else {
      incorrectChars += 1;
    }
  }

  const typedChars = correctChars + incorrectChars;
  const minutes = Math.max(elapsedMs, 1) / 60_000;
  const progress = passage.length === 0 ? 0 : (prefix / passage.length) * 100;

  return {
    wpm: typedChars === 0 ? 0 : prefix / 5 / minutes,
    accuracy: typedChars === 0 ? 0 : (correctChars / typedChars) * 100,
    progress,
  };
}
