"use client";

import { useEffect, useState } from "react";

import { AppButton } from "@/components/ui/app-button";
import { scoreTyping } from "@/lib/typing/live-score";

type PracticeLiveHudProps = {
  durationSeconds: number;
  expiresAt: number | null;
  onRestart?: () => void;
  passage: string;
  startedAt: number | null;
  typedText: string;
};

function HudStat({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span
        className={`font-mono leading-none text-foreground tabular-nums ${prominent ? "text-4xl sm:text-5xl" : "text-xl"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function PracticeLiveHud({
  durationSeconds,
  expiresAt,
  onRestart,
  passage,
  startedAt,
  typedText,
}: PracticeLiveHudProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  const remaining =
    expiresAt === null ? durationSeconds : Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const elapsedMs =
    startedAt === null ? 1 : Math.min(Math.max(now - startedAt, 1), durationSeconds * 1000);
  const score = scoreTyping(passage, typedText, elapsedMs);

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-end gap-6">
        <HudStat label="Time" prominent value={String(remaining)} />
        <HudStat label="WPM" value={String(Math.round(score.wpm))} />
        <HudStat label="Accuracy" value={`${score.accuracy.toFixed(1)}%`} />
      </div>
      {onRestart ? (
        <AppButton aria-keyshortcuts="Tab" size="sm" variant="ghost" onPress={onRestart}>
          Restart
        </AppButton>
      ) : null}
    </div>
  );
}
