import type { CSSProperties } from "react";

import { PlayerAvatar } from "@/components/player/player-avatar";

import { FinishLine } from "./finish-line";
import { carColorForId, RaceCar } from "./race-car";

export type RaceLaneRacer = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  wpm: number;
  accuracy?: number;
  progress: number;
  finished?: boolean;
  detail?: string;
};

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

function formatStats(racer: RaceLaneRacer): string {
  const parts = [`${racer.wpm} wpm`];
  if (racer.accuracy != null) {
    parts.push(`${Math.round(racer.accuracy)}%`);
  }
  if (racer.detail) {
    parts.push(racer.detail);
  }
  return parts.join(" · ");
}

export function RaceLane({ racer }: { racer: RaceLaneRacer }) {
  const progress = clampProgress(racer.progress);
  const moving = progress > 0 && !racer.finished;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PlayerAvatar avatarUrl={racer.avatarUrl ?? undefined} name={racer.name} />
          <p className="truncate text-sm font-medium text-foreground">{racer.name}</p>
          {racer.finished ? (
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-link">
              Finished
            </span>
          ) : null}
        </div>
        <p className="shrink-0 font-mono text-xs text-muted tabular-nums">{formatStats(racer)}</p>
      </div>
      <div
        aria-label={`${racer.name} progress`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(progress)}
        className="relative h-12"
        role="meter"
      >
        <div className="race-road absolute inset-y-1 right-3.5 left-0 overflow-hidden rounded-md">
          <div className="race-road-dashes absolute top-1/2 right-2 left-2 -translate-y-1/2" />
        </div>
        <div className="absolute inset-y-1 right-0 w-3.5">
          <FinishLine />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3.5 left-0">
          <div
            className="race-car-slot absolute"
            style={{ left: `calc(${progress} / 100 * (100% - var(--race-car-width)))` } as CSSProperties}
          >
            <RaceCar color={carColorForId(racer.id)} moving={moving} />
          </div>
        </div>
      </div>
    </div>
  );
}
