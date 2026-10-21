import { RaceTrack } from "./race-preview";
import { RACE_PREVIEW } from "./race-preview-data";

export function HeroSection() {
  return (
    <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
      <div className="flex max-w-xl flex-col gap-4">
        <p className="text-sm font-medium text-link">Kinyarwanda and English</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Type Fast. Race Friends. Win.
        </h1>
        <p className="text-base leading-7 text-muted">
          Challenge friends, improve your typing speed, and compete in Kinyarwanda or English.
        </p>
      </div>
      <RaceTrack label="Sample race" racers={RACE_PREVIEW.slice(0, 3)} />
    </section>
  );
}
