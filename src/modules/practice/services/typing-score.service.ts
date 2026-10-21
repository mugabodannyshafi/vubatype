import { Injectable } from '@nestjs/common';

const MIN_ELAPSED_MS = 1;
const MAX_GROSS_WPM = 400;
const MS_PER_MINUTE = 60_000;
const CHARS_PER_WORD = 5;

export interface TypingScoreInput {
  passage: string;
  typedText: string;
  startedAt: Date;
  finishedAt: Date;
  durationSeconds: number;
}

export interface TypingScore {
  elapsed_time_ms: number;
  gross_wpm: number;
  net_wpm: number;
  accuracy: number;
  correct_chars: number;
  incorrect_chars: number;
}

@Injectable()
export class TypingScoreService {
  score(input: TypingScoreInput): TypingScore {
    const durationMs = input.durationSeconds * 1000;
    const rawElapsed = input.finishedAt.getTime() - input.startedAt.getTime();
    const elapsedTimeMs = Math.min(Math.max(rawElapsed, MIN_ELAPSED_MS), durationMs);
    const comparedLength = Math.min(input.typedText.length, input.passage.length);
    let correctChars = 0;
    let incorrectChars = 0;

    for (let index = 0; index < comparedLength; index += 1) {
      if (input.typedText[index] === input.passage[index]) {
        correctChars += 1;
      } else {
        incorrectChars += 1;
      }
    }

    if (input.typedText.length > input.passage.length) {
      incorrectChars += input.typedText.length - input.passage.length;
    }

    const typedChars = correctChars + incorrectChars;
    const minutes = elapsedTimeMs / MS_PER_MINUTE;
    const grossWpm = this.roundToTwo(typedChars / CHARS_PER_WORD / minutes);
    const netWpm = this.roundToTwo(correctChars / CHARS_PER_WORD / minutes);
    const accuracy = typedChars === 0 ? 0 : this.roundToTwo((correctChars / typedChars) * 100);

    return {
      elapsed_time_ms: elapsedTimeMs,
      gross_wpm: grossWpm,
      net_wpm: netWpm,
      accuracy,
      correct_chars: correctChars,
      incorrect_chars: incorrectChars,
    };
  }

  isPlausible(typedLength: number, elapsedTimeMs: number): boolean {
    const minutes = Math.max(elapsedTimeMs, MIN_ELAPSED_MS) / MS_PER_MINUTE;
    const grossWpm = typedLength / CHARS_PER_WORD / minutes;
    return grossWpm <= MAX_GROSS_WPM;
  }

  private roundToTwo(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
