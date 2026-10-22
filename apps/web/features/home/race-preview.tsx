import { RaceLane } from "@/components/race/race-lane";

import type { RacePreviewRacer } from "./race-preview-data";

type RaceTrackProps = {
  racers: RacePreviewRacer[];
  label: string;
};

export function RaceTrack({ racers, label }: RaceTrackProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <div className="flex flex-col gap-3">
        {racers.map((racer) => (
          <RaceLane
            key={racer.id}
            racer={{
              id: racer.id,
              name: racer.name,
              wpm: racer.wpm,
              progress: racer.progress,
              detail: racer.detail,
            }}
          />
        ))}
      </div>
    </div>
  );
}
