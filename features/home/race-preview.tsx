import type { CSSProperties } from "react";

import type { RacePreviewRacer } from "./race-preview-data";

type RaceTrackProps = {
  racers: RacePreviewRacer[];
  label: string;
};

function RunnerFigure({ leading }: { leading: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`race-runner-figure h-7 w-10 ${leading ? "text-accent" : "text-foreground"}`}
      fill="none"
      viewBox="0 0 48 32"
    >
      <circle cx="34" cy="6.5" r="3.1" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M31.2 9.4 22 15.6h6.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path
        d="M26.2 12.4 34.2 10.8 40 14.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path
        d="M22 15.6 13.5 23 7.5 19.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path
        d="M24.2 15.2 32.4 22 38.5 17.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function FinishMark() {
  return (
    <svg aria-hidden="true" className="h-9 w-3 text-accent" fill="none" viewBox="0 0 12 48">
      <path d="M1.5 2 9 10 1.5 18" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M1.5 16 9 24 1.5 32" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M1.5 30 9 38 1.5 46" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function RaceLane({ racer, leading }: { racer: RacePreviewRacer; leading: boolean }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{racer.name}</p>
        <p className="font-mono text-xs text-muted tabular-nums">{racer.wpm} wpm</p>
      </div>
      <div
        className="race-lane relative h-10"
        style={{ "--race-progress": racer.progress } as CSSProperties}
      >
        <div className="absolute inset-y-3 right-5 left-0 rounded-full bg-surface-secondary" />
        <div className="race-progress absolute inset-y-3 left-0 rounded-full bg-accent/20" />
        <div className="race-runner absolute top-1.5">
          <RunnerFigure leading={leading} />
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <FinishMark />
        </div>
      </div>
    </div>
  );
}

export function RaceTrack({ racers, label }: RaceTrackProps) {
  const leaderId = racers.reduce((leader, racer) => (racer.progress > leader.progress ? racer : leader)).id;

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <div className="flex flex-col gap-1.5">
        {racers.map((racer) => (
          <RaceLane key={racer.id} leading={racer.id === leaderId} racer={racer} />
        ))}
      </div>
    </div>
  );
}
