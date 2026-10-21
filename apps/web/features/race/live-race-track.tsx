import type { CSSProperties } from "react";

import { PlayerAvatar } from "@/components/player/player-avatar";

export type LiveRacer = {
  id: string;
  name: string;
  avatarUrl: string | null;
  wpm: number;
  progress: number;
  finished: boolean;
};

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

function RacerFigure({ leading }: { leading: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-7 w-10 ${leading ? "text-accent" : "text-foreground"}`}
      fill="none"
      viewBox="0 0 48 32"
    >
      <circle cx="34" cy="6.5" r="3.1" stroke="currentColor" strokeWidth="1.75" />
      <path d="M31.2 9.4 22 15.6h6.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
      <path d="M26.2 12.4 34.2 10.8 40 14.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
      <path d="M22 15.6 13.5 23 7.5 19.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
      <path d="M24.2 15.2 32.4 22 38.5 17.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
    </svg>
  );
}

function FinishLine() {
  return (
    <div aria-hidden="true" className="flex h-10 w-3 flex-col overflow-hidden rounded-sm border border-border">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className={index % 2 === 0 ? "min-h-0 flex-1 bg-foreground" : "min-h-0 flex-1 bg-surface"} />
      ))}
    </div>
  );
}

function LiveLane({ racer, leading }: { racer: LiveRacer; leading: boolean }) {
  const progress = clampProgress(racer.progress);

  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <PlayerAvatar avatarUrl={racer.avatarUrl ?? undefined} name={racer.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{racer.name}</p>
          <p className="truncate font-mono text-xs text-muted tabular-nums">
            {racer.wpm} wpm · {Math.round(progress)}%
          </p>
        </div>
      </div>
      <div className="relative h-12">
        <div className="absolute inset-y-0 right-0 flex items-center">
          <FinishLine />
        </div>
        <div className="absolute inset-y-0 right-6 left-0">
          <div className="absolute inset-y-3 right-0 left-0 rounded-full bg-surface-secondary" />
          <div className="live-race-fill absolute inset-y-3 left-0 rounded-full bg-accent/20" style={{ width: `${progress}%` }} />
          <div
            className="live-race-car absolute top-1"
            style={{ left: `calc(${progress} * (100% - 2.5rem) / 100)` } as CSSProperties}
          >
            <RacerFigure leading={leading} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveRaceTrack({ racers }: { racers: LiveRacer[] }) {
  const leader = racers.reduce((current, racer) => (racer.progress > current.progress ? racer : current), racers[0]);

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2">
        {racers.map((racer) => (
          <LiveLane key={racer.id} leading={racer.id === leader?.id} racer={racer} />
        ))}
      </div>
    </div>
  );
}
