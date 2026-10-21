"use client";

import { useRouter } from "next/navigation";

import { AppButton } from "@/components/ui/app-button";
import type { PracticeResult } from "@/lib/api/practice";
import { paceConsistency, type PaceSample } from "@/lib/typing/pace";

import { PracticeChart } from "./practice-chart";

type PracticeResultsProps = {
  onChangeSettings: () => void;
  onTryAgain: () => void;
  result: PracticeResult;
  samples: PaceSample[];
};

function formatElapsed(elapsedMs: number): string {
  const seconds = elapsedMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatDifficulty(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-mono text-lg leading-none text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

export function PracticeResults({ onChangeSettings, onTryAgain, result, samples }: PracticeResultsProps) {
  const router = useRouter();
  const consistency = paceConsistency(samples);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">WPM</span>
          <span className="font-mono text-6xl leading-none text-foreground tabular-nums sm:text-7xl">
            {Math.round(result.net_wpm)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">Accuracy</span>
          <span className="font-mono text-6xl leading-none text-foreground tabular-nums sm:text-7xl">
            {result.accuracy.toFixed(1)}%
          </span>
        </div>
      </div>
      <p className="text-sm text-muted">
        Calculated by the server from your typed text.
        {result.keystrokes_verified ? " Keystrokes verified." : ""}
      </p>
      <PracticeChart samples={samples} />
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        <ResultStat label="Gross WPM" value={result.gross_wpm.toFixed(1)} />
        <ResultStat label="Correct" value={String(result.correct_chars)} />
        <ResultStat label="Incorrect" value={String(result.incorrect_chars)} />
        <ResultStat label="Time" value={formatElapsed(result.elapsed_time_ms)} />
        <ResultStat label="Language" value={result.passage.language.name} />
        <ResultStat label="Difficulty" value={formatDifficulty(result.passage.difficulty)} />
        <ResultStat label="Duration" value={`${result.duration_seconds}s`} />
        {consistency === null ? null : <ResultStat label="Consistency" value={`${Math.round(consistency)}%`} />}
      </dl>
      <div className="flex flex-wrap gap-3">
        <AppButton onPress={onTryAgain}>Try Again</AppButton>
        <AppButton variant="secondary" onPress={onChangeSettings}>
          Change Settings
        </AppButton>
        <AppButton variant="ghost" onPress={() => router.push("/")}>
          Back to Home
        </AppButton>
      </div>
    </div>
  );
}
