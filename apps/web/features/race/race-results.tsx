"use client";

import { AppButton } from "@/components/ui/app-button";
import type { RaceRacer, RoomYou } from "@/lib/race/types";

type RaceResultsProps = {
  onLeave: () => void;
  onRematch: () => void;
  racers: RaceRacer[];
  you: RoomYou | null;
};

function formatTime(ms: number | null): string {
  if (ms == null) {
    return "—";
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function RaceResults({ onLeave, onRematch, racers, you }: RaceResultsProps) {
  const ordered = [...racers].sort((left, right) => left.rank - right.rank);
  const winner = ordered[0];
  const mine = you ? ordered.find((racer) => racer.guest_id === you.id) : undefined;
  const title = winner?.finished ? `${winner.nickname} wins` : "Time's up";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Results</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
      </div>
      {mine ? (
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Your place" value={`#${mine.rank}`} />
          <Stat label="WPM" value={String(Math.round(mine.wpm))} />
          <Stat label="Accuracy" value={`${mine.accuracy.toFixed(1)}%`} />
          <Stat label="Time" value={formatTime(mine.completion_time_ms)} />
        </dl>
      ) : null}
      <ol className="flex flex-col gap-2">
        {ordered.map((racer) => (
          <li
            key={racer.guest_id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem_4.5rem] items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <span className="font-mono text-sm text-muted tabular-nums">{racer.rank}</span>
            <span className="truncate text-sm font-medium text-foreground">
              {racer.nickname}
              {racer.guest_id === you?.id ? " · you" : ""}
            </span>
            <span className="text-right font-mono text-sm text-foreground tabular-nums">{Math.round(racer.wpm)} wpm</span>
            <span className="text-right font-mono text-sm text-muted tabular-nums">{racer.accuracy.toFixed(0)}%</span>
            <span className="text-right font-mono text-sm text-muted tabular-nums">
              {formatTime(racer.completion_time_ms)}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        {you?.is_host ? <AppButton onPress={onRematch}>Race again</AppButton> : null}
        <AppButton variant={you?.is_host ? "secondary" : "primary"} onPress={onLeave}>
          Leave
        </AppButton>
      </div>
      {you && !you.is_host ? (
        <p className="text-sm text-muted">The host can bring everyone back to the lobby for another race.</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-mono text-3xl leading-none text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
