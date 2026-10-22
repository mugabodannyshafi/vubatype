"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { TypingInput } from "@/components/typing/typing-input";
import { TypingSoundControl } from "@/components/typing/typing-sound-control";
import { TypingText } from "@/components/typing/typing-text";
import { useTypingSound } from "@/lib/sound/use-typing-sound";
import { buildTypingCharacters, typingCaretIndex } from "@/lib/typing/characters";
import { scoreRaceTyping } from "@/lib/race/progress";
import type { RaceRacer } from "@/lib/race/types";

import { LiveRaceTrack, type LiveRacer } from "./live-race-track";

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

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
  const typingSound = useTypingSound(passage, typedText, "exact");
  const [now, setNow] = useState(() => Date.now());
  const characters = useMemo(() => buildTypingCharacters(passage, typedText), [passage, typedText]);
  const finishedLocally = passage.length > 0 && typedText === passage;
  const racing = screen === "racing" && !finishedLocally;
  const serverNow = now + serverOffset;
  const countdownSeconds =
    screen === "countdown" && startsAt != null ? Math.ceil((startsAt - serverNow) / 1000) : 0;
  const countdown = countdownSeconds > 0 ? countdownSeconds : null;
  const remaining = deadlineAt == null ? null : deadlineAt - serverNow;
  const elapsed = screen === "racing" && startsAt != null ? Math.max(0, serverNow - startsAt) : 0;
  const stats = scoreRaceTyping(passage, typedText, elapsed);
  const lanes: LiveRacer[] = [...racers]
    .sort((left, right) => left.rank - right.rank)
    .map((racer) => ({
      id: String(racer.guest_id),
      name: racer.nickname,
      avatarUrl: racer.avatar_url,
      wpm: Math.round(racer.wpm),
      accuracy: racer.accuracy,
      progress: racer.progress,
      finished: racer.finished,
    }));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {screen === "countdown" ? "Get ready" : "Race"}
        </p>
        <div className="flex flex-wrap items-end gap-6">
          {screen === "racing" ? (
            <>
              <Stat label="WPM" value={String(Math.round(stats.wpm))} />
              <Stat label="Accuracy" value={`${Math.round(stats.accuracy)}%`} />
              <Stat label="Done" value={`${Math.round(stats.progress)}%`} />
            </>
          ) : null}
          {screen === "racing" && remaining != null ? (
            <Stat label="Time" value={formatClock(remaining)} large />
          ) : null}
          <TypingSoundControl />
        </div>
      </div>
      {lanes.length > 0 ? <LiveRaceTrack racers={lanes} /> : null}
      <div className="relative rounded-lg border border-border bg-surface px-4 py-5 sm:px-6">
        {countdown != null ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-surface/80">
            <p className="font-mono text-7xl text-accent tabular-nums" aria-live="assertive">
              {countdown}
            </p>
          </div>
        ) : null}
        {passage.length > 0 ? (
          <TypingText
            caretIndex={racing ? typingCaretIndex(passage.length, typedText.length) : null}
            characters={characters}
            contained={false}
            label={passage}
          />
        ) : (
          <p className="text-sm text-muted">Waiting for the passage</p>
        )}
        {racing ? (
          <TypingInput
            active
            inputRef={inputRef}
            mode="typing"
            restoreFocus
            onAbandon={() => {}}
            onBackspace={() => typingSound.backspace(onBackspace)}
            onBlur={() => {}}
            onFocus={() => {}}
            onInsert={(text) => typingSound.insert(text, onType)}
            onRestart={() => {}}
            onStart={(text) => typingSound.insert(text, onType)}
          />
        ) : null}
      </div>
      {finishedLocally && screen === "racing" ? (
        <p className="text-sm text-muted">Finished. Waiting for the other racers.</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span className={`font-mono leading-none text-foreground tabular-nums ${large ? "text-3xl" : "text-lg"}`}>
        {value}
      </span>
    </div>
  );
}
