type TypingTimerProps = {
  seconds: number;
  label?: string;
};

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TypingTimer({ seconds, label = "Time" }: TypingTimerProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span className="font-mono text-base leading-none text-foreground tabular-nums">
        {formatDuration(seconds)}
      </span>
    </div>
  );
}
