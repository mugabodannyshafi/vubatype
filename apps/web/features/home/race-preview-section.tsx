import { RaceTrack } from "./race-preview";
import { RACE_PREVIEW } from "./race-preview-data";

export function RacePreviewSection() {
  return (
    <section aria-labelledby="race-preview-title" className="flex flex-col gap-4">
      <div className="flex max-w-xl flex-col gap-1">
        <h2 id="race-preview-title" className="text-xl font-semibold tracking-tight text-foreground">
          On the track
        </h2>
        <p className="text-sm leading-6 text-muted">
          Cars advance as players type correctly. These racers are a preview, not a live match.
        </p>
      </div>
      <RaceTrack label="Preview" racers={RACE_PREVIEW} />
    </section>
  );
}
