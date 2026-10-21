"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { TypingInput } from "@/components/typing/typing-input";
import { TypingText } from "@/components/typing/typing-text";
import { RaceTrack } from "@/features/home/race-preview";
import type { RacePreviewRacer } from "@/features/home/race-preview-data";
import { buildTypingCharacters, typingCaretIndex } from "@/lib/typing/characters";
import type { RaceRacer } from "@/lib/race/types";

type RaceStageProps = {
  deadlineAt: number | null;
  onBackspace: () => void;
  onType: (text: string) => void;
  passage: string;
  racers: RaceRacer[];
  screen: "countdown" | "racing";
  serverOffset: number;
  startsAt: number | null;
  typedText: string;
};

function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}

export function RaceStage({
  deadlineAt,
  onBackspace,
  onType,
  passage,
  racers,
  screen,
  serverOffset,
  startsAt,
  typedText,
}: RaceStageProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const characters = useMemo(() => buildTypingCharacters(passage, typedText), [passage, typedText]);
  const finishedLocally = passage.length > 0 && typedText.length >= passage.length;
  const racing = screen === "racing" && !finishedLocally;
  const serverNow = now + serverOffset;
  const countdown =
    screen === "countdown" && startsAt != null ? Math.max(1, Math.ceil((startsAt - serverNow) / 1000)) : null;
  const remaining = deadlineAt == null ? null : deadlineAt - serverNow;
  const lanes: RacePreviewRacer[] = [...racers]
    .sort((left, right) => left.rank - right.rank)
    .map((racer) => ({
      id: String(racer.guest_id),
      name: racer.nickname,
      wpm: Math.round(racer.wpm),
      progress: racer.progress,
      detail: `${racer.accuracy.toFixed(0)}%`,
    }));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {screen === "countdown" ? "Get ready" : "Race"}
        </p>
        {screen === "racing" && remaining != null ? (
          <p className="font-mono text-3xl leading-none text-foreground tabular-nums">{formatRemaining(remaining)}</p>
        ) : null}
      </div>
      {lanes.length > 0 ? <RaceTrack label="Live" racers={lanes} /> : null}
      <div className="relative">
        {countdown != null ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <p className="font-mono text-7xl text-accent tabular-nums" aria-live="assertive">
              {countdown}
            </p>
          </div>
        ) : null}
        {passage.length > 0 ? (
          <TypingText
            caretIndex={racing ? typingCaretIndex(passage.length, typedText.length) : null}
            characters={characters}
            label={passage}
          />
        ) : (
          <div className="typing-text typing-text-window flex items-center">
            <p className="text-sm text-muted">Waiting for the passage</p>
          </div>
        )}
        {racing ? (
          <TypingInput
            active
            inputRef={inputRef}
            mode="typing"
            onAbandon={() => {}}
            onBackspace={onBackspace}
            onBlur={() => {}}
            onFocus={() => {}}
            onInsert={onType}
            onRestart={() => {}}
            onStart={onType}
          />
        ) : null}
      </div>
      {finishedLocally && screen === "racing" ? (
        <p className="text-sm text-muted">Finished. Waiting for the other racers.</p>
      ) : null}
    </div>
  );
}
