/// <reference types="jest" />

import {
  acceptsTypedUpdate,
  appendPaceSample,
  correctPrefixLength,
  countTypingDelta,
  isExactCompletion,
  progressPercent,
  scoreRaceProgress,
  type RacePaceSample,
} from './race-progress';

describe('race progress', () => {
  const passage = 'hello world';

  it('counts only the correct prefix toward progress', () => {
    expect(correctPrefixLength(passage, 'hello')).toBe(5);
    expect(correctPrefixLength(passage, 'hallo')).toBe(1);
    expect(progressPercent(passage, 'hello')).toBeCloseTo((5 / passage.length) * 100, 2);
    expect(progressPercent('a'.repeat(100), 'a'.repeat(50) + 'b')).toBe(50);
    expect(progressPercent(passage, 'x'.repeat(passage.length))).toBe(0);
  });

  it('finishes only on an exact match and clamps at 100', () => {
    expect(isExactCompletion(passage, passage)).toBe(true);
    expect(isExactCompletion(passage, 'hello worl')).toBe(false);
    expect(isExactCompletion(passage, `${passage} `)).toBe(false);
    expect(progressPercent(passage, passage)).toBe(100);
  });

  it('accepts an extension or a backspace and rejects a rewrite', () => {
    expect(acceptsTypedUpdate('he', 'hello')).toBe(true);
    expect(acceptsTypedUpdate('hello', 'he')).toBe(true);
    expect(acceptsTypedUpdate('hello', 'hallo')).toBe(false);
  });

  it('scores net speed from the correct prefix over server elapsed time', () => {
    const startedAt = 1_000;
    const score = scoreRaceProgress(passage, 'hallo', startedAt, startedAt + 30_000, 60);

    expect(score.progress).toBeCloseTo((1 / passage.length) * 100, 2);
    expect(score.netWpm).toBeCloseTo(1 / 5 / 0.5, 2);
    expect(score.accuracy).toBeLessThan(100);
    expect(score.incorrectChars).toBeGreaterThan(0);
    expect(score.elapsedMs).toBe(30_000);
  });

  it('counts new characters and only treats a deleted mistake as a correction', () => {
    expect(countTypingDelta(passage, '', 'he')).toEqual({
      correctKeystrokes: 2,
      incorrectKeystrokes: 0,
      corrections: 0,
    });
    expect(countTypingDelta(passage, 'he', 'hex')).toEqual({
      correctKeystrokes: 0,
      incorrectKeystrokes: 1,
      corrections: 0,
    });
    expect(countTypingDelta(passage, 'hex', 'he')).toEqual({
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      corrections: 1,
    });
    expect(countTypingDelta(passage, 'hello', 'hell')).toEqual({
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      corrections: 0,
    });
    expect(countTypingDelta(passage, 'hello', 'hallo')).toEqual({
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      corrections: 0,
    });
  });

  it('keeps one pace sample per elapsed second and caps the race duration', () => {
    const samples: RacePaceSample[] = [];
    appendPaceSample(samples, { t: 0, prefix: 0, incorrect: 0, typed: 0 }, 2);
    appendPaceSample(samples, { t: 400, prefix: 1, incorrect: 0, typed: 1 }, 2);
    appendPaceSample(samples, { t: 1_000, prefix: 2, incorrect: 0, typed: 2 }, 2);
    appendPaceSample(samples, { t: 2_400, prefix: 4, incorrect: 1, typed: 5 }, 2);
    appendPaceSample(samples, { t: 500, prefix: 9, incorrect: 9, typed: 9 }, 2);

    expect(samples).toEqual([
      { t: 400, prefix: 1, incorrect: 0, typed: 1 },
      { t: 1_000, prefix: 2, incorrect: 0, typed: 2 },
      { t: 2_000, prefix: 4, incorrect: 1, typed: 5 },
    ]);
  });
});
