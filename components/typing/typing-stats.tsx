import type { TypingStatsData } from "@/lib/types/typing";

type TypingStatsProps = TypingStatsData;

function formatAccuracy(accuracy: number): string {
  return `${accuracy.toFixed(1)}%`;
}

export function TypingStats({ wpm, accuracy }: TypingStatsProps) {
  return (
    <dl className="flex items-end gap-6">
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs font-medium tracking-wide text-muted uppercase">WPM</dt>
        <dd className="font-mono text-base leading-none text-foreground tabular-nums">
          {Math.round(wpm)}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs font-medium tracking-wide text-muted uppercase">Accuracy</dt>
        <dd className="font-mono text-base leading-none text-foreground tabular-nums">
          {formatAccuracy(accuracy)}
        </dd>
      </div>
    </dl>
  );
}
