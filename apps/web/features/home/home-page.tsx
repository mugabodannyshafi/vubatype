import { GameActions } from "./game-actions";
import { HeroSection } from "./hero-section";
import { HowItWorks } from "./how-it-works";
import { RacePreviewSection } from "./race-preview-section";

export function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 pt-10 pb-16 sm:pt-14">
      <HeroSection />
      <GameActions />
      <RacePreviewSection />
      <HowItWorks />
    </div>
  );
}
