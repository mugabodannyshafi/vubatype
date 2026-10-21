const MIN_ELAPSED_MS = 1;
const MS_PER_MINUTE = 60_000;
const CHARS_PER_WORD = 5;

export interface RaceTypingScore {
  progress: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  elapsedMs: number;
}

export function correctPrefixLength(passage: string, typedText: string): number {
  const limit = Math.min(passage.length, typedText.length);
  let index = 0;
  while (index < limit && passage[index] === typedText[index]) {
    index += 1;
  }
  return index;
}

export function progressPercent(passage: string, typedText: string): number {
  if (passage.length === 0) {
    return 0;
  }
  const value = (correctPrefixLength(passage, typedText) / passage.length) * 100;
  return clampPercent(value);
}

export function isExactCompletion(passage: string, typedText: string): boolean {
  return passage.length > 0 && typedText === passage;
}

export function acceptsTypedUpdate(previous: string, next: string): boolean {
  return next.startsWith(previous) || previous.startsWith(next);
}

export function raceElapsedMs(startedAt: number, endedAt: number, durationSeconds: number): number {
  const raw = endedAt - startedAt;
  const cap = Math.max(durationSeconds, 0) * 1000;
  return Math.min(Math.max(raw, MIN_ELAPSED_MS), Math.max(cap, MIN_ELAPSED_MS));
}

export function scoreRaceProgress(
  passage: string,
  typedText: string,
  startedAt: number,
  endedAt: number,
  durationSeconds: number,
): RaceTypingScore {
  const elapsedMs = raceElapsedMs(startedAt, endedAt, durationSeconds);
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

  if (typedText.length > passage.length) {
    incorrectChars += typedText.length - passage.length;
  }

  const typedChars = correctChars + incorrectChars;
  const minutes = elapsedMs / MS_PER_MINUTE;
  const prefix = correctPrefixLength(passage, typedText);

  return {
    progress: progressPercent(passage, typedText),
    grossWpm: roundToTwo(typedChars / CHARS_PER_WORD / minutes),
    netWpm: roundToTwo(prefix / CHARS_PER_WORD / minutes),
    accuracy: typedChars === 0 ? 0 : roundToTwo((correctChars / typedChars) * 100),
    correctChars,
    incorrectChars,
    elapsedMs,
  };
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round((value + Number.EPSILON) * 100) / 100));
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
