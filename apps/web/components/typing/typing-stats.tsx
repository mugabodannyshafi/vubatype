import type { TypingStatsData } from "@/lib/types/typing";

type TypingStatsProps = TypingStatsData & {
  progress?: number;
  correctChars?: number;
  incorrectChars?: number;
};

function formatAccuracy(accuracy: number): string {
  return `${accuracy.toFixed(1)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-mono text-base leading-none text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

export function TypingStats({ wpm, accuracy, progress, correctChars, incorrectChars }: TypingStatsProps) {
  return (
    <dl className="flex flex-wrap items-end gap-6">
      <Stat label="WPM" value={String(Math.round(wpm))} />
      <Stat label="Accuracy" value={formatAccuracy(accuracy)} />
      {progress === undefined ? null : <Stat label="Progress" value={`${Math.round(progress * 100)}%`} />}
      {correctChars === undefined ? null : <Stat label="Correct" value={String(correctChars)} />}
      {incorrectChars === undefined ? null : <Stat label="Errors" value={String(incorrectChars)} />}
    </dl>
  );
}
