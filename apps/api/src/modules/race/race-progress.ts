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

export interface KeystrokeDelta {
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  corrections: number;
}

export interface RacePaceSample {
  t: number;
  prefix: number;
  incorrect: number;
  typed: number;
}

export function countTypingDelta(passage: string, previous: string, next: string): KeystrokeDelta {
  if (next.startsWith(previous)) {
    let correctKeystrokes = 0;
    let incorrectKeystrokes = 0;
    for (let index = previous.length; index < next.length; index += 1) {
      if (index < passage.length && next[index] === passage[index]) {
        correctKeystrokes += 1;
      } else {
        incorrectKeystrokes += 1;
      }
    }
    return { correctKeystrokes, incorrectKeystrokes, corrections: 0 };
  }

  if (previous.startsWith(next)) {
    let corrections = 0;
    for (let index = next.length; index < previous.length; index += 1) {
      const removed = previous[index];
      const wasWrong = index >= passage.length || removed !== passage[index];
      if (wasWrong) {
        corrections += 1;
      }
    }
    return { correctKeystrokes: 0, incorrectKeystrokes: 0, corrections };
  }

  return { correctKeystrokes: 0, incorrectKeystrokes: 0, corrections: 0 };
}

export function appendPaceSample(
  samples: RacePaceSample[],
  sample: RacePaceSample,
  durationSeconds: number,
): void {
  const capMs = Math.max(durationSeconds, 0) * 1000;
  const elapsed = Math.min(Math.max(sample.t, 0), capMs);
  const second = Math.floor(elapsed / 1000);
  const last = samples[samples.length - 1];
  const next: RacePaceSample = {
    t: elapsed,
    prefix: sample.prefix,
    incorrect: sample.incorrect,
    typed: sample.typed,
  };

  if (last && Math.floor(last.t / 1000) === second) {
    samples[samples.length - 1] = next;
    return;
  }

  if (last && second < Math.floor(last.t / 1000)) {
    return;
  }

  if (samples.length >= Math.max(durationSeconds, 0) + 1) {
    return;
  }

  samples.push(next);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round((value + Number.EPSILON) * 100) / 100));
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
