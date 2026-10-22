import type { RacePaceSample } from "@/lib/race/types";

export type RacePacePoint = {
  second: number;
  wpm: number;
};

const CHART_MIN_SPAN_MS = 2_000;
const CONSISTENCY_MIN_ACTIVE_SECONDS = 4;

type RaceBurst = {
  elapsedMs: number;
  wpm: number;
  typed: number;
};

export function racePaceBursts(samples: RacePaceSample[]): RaceBurst[] {
  const bursts: RaceBurst[] = [];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const next = samples[index];
    if (!previous || !next) {
      continue;
    }

    const deltaMs = next.t - previous.t;
    if (deltaMs <= 0) {
      continue;
    }

    const minutes = deltaMs / 60_000;
    bursts.push({
      elapsedMs: next.t,
      wpm: (next.prefix - previous.prefix) / 5 / minutes,
      typed: next.typed - previous.typed,
    });
  }

  return bursts;
}

export function racePacePoints(samples: RacePaceSample[]): RacePacePoint[] {
  return racePaceBursts(samples).map((burst) => ({
    second: Math.max(1, Math.round(burst.elapsedMs / 1000)),
    wpm: burst.wpm,
  }));
}

export function hasRacePaceChart(samples: RacePaceSample[]): boolean {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || samples.length < 2) {
    return false;
  }

  return last.t - first.t >= CHART_MIN_SPAN_MS;
}

export function peakRaceWpm(samples: RacePaceSample[]): number | null {
  if (!hasRacePaceChart(samples)) {
    return null;
  }

  const active = racePaceBursts(samples).filter((burst) => burst.typed > 0 && burst.wpm > 0);
  if (active.length === 0) {
    return null;
  }

  return Math.max(...active.map((burst) => burst.wpm));
}

export function racePaceConsistency(samples: RacePaceSample[]): number | null {
  const active = racePaceBursts(samples).filter((burst) => burst.typed > 0);
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
