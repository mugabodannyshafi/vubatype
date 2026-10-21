import { scoreTyping } from "@/lib/typing/live-score";

export type PaceSample = {
  elapsedMs: number;
  correctChars: number;
  typedChars: number;
  incorrectChars: number;
};

export type PaceBurst = {
  fromMs: number;
  elapsedMs: number;
  wpm: number;
  rawWpm: number;
  errors: number;
  typed: number;
};

export type PaceChartPoint = {
  second: number;
  wpm: number;
  rawWpm: number;
  errors: number;
};

const CHART_MIN_SPAN_MS = 2_000;
const CONSISTENCY_MIN_ACTIVE_SECONDS = 4;

export function paceSample(passage: string, typedText: string, elapsedMs: number): PaceSample {
  const score = scoreTyping(passage, typedText, Math.max(elapsedMs, 1));
  return {
    elapsedMs,
    correctChars: score.correctChars,
    typedChars: score.correctChars + score.incorrectChars,
    incorrectChars: score.incorrectChars,
  };
}

export function paceBursts(samples: PaceSample[]): PaceBurst[] {
  const bursts: PaceBurst[] = [];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const next = samples[index];
    if (!previous || !next) {
      continue;
    }

    const deltaMs = next.elapsedMs - previous.elapsedMs;
    if (deltaMs <= 0) {
      continue;
    }

    const minutes = deltaMs / 60_000;
    const correct = next.correctChars - previous.correctChars;
    const typed = next.typedChars - previous.typedChars;
    bursts.push({
      fromMs: previous.elapsedMs,
      elapsedMs: next.elapsedMs,
      wpm: correct / 5 / minutes,
      rawWpm: typed / 5 / minutes,
      errors: next.incorrectChars - previous.incorrectChars,
      typed,
    });
  }

  return bursts;
}

export function paceChartPoints(samples: PaceSample[]): PaceChartPoint[] {
  return paceBursts(samples).map((burst) => ({
    second: Math.max(1, Math.round(burst.elapsedMs / 1000)),
    wpm: burst.wpm,
    rawWpm: burst.rawWpm,
    errors: Math.max(0, burst.errors),
  }));
}

export function hasPaceChart(samples: PaceSample[]): boolean {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || samples.length < 2) {
    return false;
  }

  return last.elapsedMs - first.elapsedMs >= CHART_MIN_SPAN_MS;
}

export function paceConsistency(samples: PaceSample[]): number | null {
  const active = paceBursts(samples).filter((burst) => burst.typed > 0);
  if (active.length < CONSISTENCY_MIN_ACTIVE_SECONDS) {
    return null;
  }

  const mean = active.reduce((sum, burst) => sum + burst.wpm, 0) / active.length;
  if (mean <= 0) {
    return null;
  }

  const variance = active.reduce((sum, burst) => sum + (burst.wpm - mean) ** 2, 0) / active.length;
  const consistency = 100 * (1 - Math.sqrt(variance) / mean);
  return Math.min(100, Math.max(0, consistency));
}
