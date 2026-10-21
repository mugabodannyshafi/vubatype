"use client";

import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { useTypingLanguage } from "@/components/language/language-provider";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { TypingInput } from "@/components/typing/typing-input";
import { TypingStats } from "@/components/typing/typing-stats";
import { TypingText } from "@/components/typing/typing-text";
import { TypingTimer } from "@/components/typing/typing-timer";
import { useTypingSettingsLock } from "@/components/typing/typing-settings-lock";
import { AppButton } from "@/components/ui/app-button";
import { getLanguageName, TYPING_SAMPLES } from "@/lib/constants/languages";
import type { PracticeDifficulty } from "@/lib/api/practice";
import { buildTypingCharacters, typingCaretIndex } from "@/lib/typing/characters";
import { scoreTyping } from "@/lib/typing/live-score";
import { useSoloPractice } from "@/features/practice/use-solo-practice";

import { buildTypingPreview, getPreviewStats } from "./preview";

const DURATIONS = [15, 30, 60] as const;
const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const satisfies ReadonlyArray<{ value: PracticeDifficulty; label: string }>;

type Duration = (typeof DURATIONS)[number];

function isDuration(value: string): value is `${Duration}` {
  return DURATIONS.some((duration) => String(duration) === value);
}

function isDifficulty(value: string): value is PracticeDifficulty {
  return DIFFICULTIES.some((difficulty) => difficulty.value === value);
}

function readSelection(keys: Iterable<unknown>): string | null {
  const key = [...keys][0];
  return typeof key === "string" ? key : null;
}

export function PracticePage() {
  const { language } = useTypingLanguage();
  const { setLocked } = useTypingSettingsLock();
  const practice = useSoloPractice();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [duration, setDuration] = useState<Duration>(30);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("medium");
  const sample = TYPING_SAMPLES[language];
  const previewCharacters = buildTypingPreview(sample);
  const previewStats = getPreviewStats(previewCharacters);
  const settingsLocked =
    practice.phase === "starting" || practice.phase === "typing" || practice.phase === "finishing";
  const hasPassage = practice.passage.length > 0;
  const showLive = hasPassage && practice.phase !== "idle" && practice.phase !== "starting";
  const caretActive = practice.phase === "typing" || practice.phase === "finishing";
  const characters = showLive
    ? buildTypingCharacters(practice.passage, practice.typedText).map((character) =>
        caretActive || character.state !== "current" ? character : { ...character, state: "pending" as const },
      )
    : previewCharacters;
  const caretIndex = caretActive
    ? typingCaretIndex(practice.passage.length, practice.typedText.length)
    : null;

  useEffect(() => {
    setLocked(settingsLocked);
    return () => setLocked(false);
  }, [setLocked, settingsLocked]);

  const elapsedMs =
    practice.startedAt === null ? 0 : Math.min(Math.max(practice.now - practice.startedAt, 1), practice.durationSeconds * 1000);
  const liveScore = showLive ? scoreTyping(practice.passage, practice.typedText, elapsedMs) : null;
  const remainingSeconds =
    practice.expiresAt === null ? duration : Math.max(0, Math.ceil((practice.expiresAt - practice.now) / 1000));
  const timerSeconds = practice.result
    ? practice.result.elapsed_time_ms / 1000
    : practice.phase === "typing" || practice.phase === "finishing"
      ? remainingSeconds
      : duration;
  const showStartError = practice.phase === "error" && practice.error && !hasPassage;
  const showFinishError = practice.phase === "error" && practice.error && hasPassage;

  function focusTyping(event: MouseEvent<HTMLElement>) {
    if (practice.phase !== "typing") {
      return;
    }
    event.preventDefault();
    inputRef.current?.focus();
  }

  function startTest() {
    void practice.start({
      language_code: language,
      difficulty,
      duration_seconds: duration,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-10 sm:pt-10">
      <div className="flex max-w-xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Practice</h1>
        <p className="text-base leading-7 text-muted">
          Practice on your own in Kinyarwanda or English.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <AppButton
          isDisabled={settingsLocked}
          isPending={practice.phase === "starting" || practice.phase === "finishing"}
          onPress={startTest}
        >
          {practice.phase === "finished" ? "Try Again" : "Start Typing"}
        </AppButton>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">Language</span>
          <span className="flex h-9 items-center text-sm text-foreground md:h-8">
            {getLanguageName(language)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">Duration</span>
          <ToggleButtonGroup
            aria-label="Duration"
            disallowEmptySelection
            isDisabled={settingsLocked}
            selectedKeys={[String(duration)]}
            selectionMode="single"
            size="sm"
            onSelectionChange={(keys) => {
              if (settingsLocked) {
                return;
              }
              const key = readSelection(keys);
              if (key && isDuration(key)) {
                setDuration(Number(key) as Duration);
              }
            }}
          >
            {DURATIONS.map((value) => (
              <ToggleButton key={value} id={String(value)}>
                {value}s
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">Difficulty</span>
          <ToggleButtonGroup
            aria-label="Difficulty"
            disallowEmptySelection
            isDisabled={settingsLocked}
            selectedKeys={[difficulty]}
            selectionMode="single"
            size="sm"
            onSelectionChange={(keys) => {
              if (settingsLocked) {
                return;
              }
              const key = readSelection(keys);
              if (key && isDifficulty(key)) {
                setDifficulty(key);
              }
            }}
          >
            {DIFFICULTIES.map((option) => (
              <ToggleButton key={option.value} id={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      </div>
      <section
        className="rounded-lg border border-border bg-surface px-4 py-5 sm:px-6 sm:py-6"
        onMouseDown={focusTyping}
      >
        {practice.phase === "starting" ? <LoadingState label="Preparing your passage" /> : null}
        {showStartError && practice.error ? (
          <ErrorState description={practice.error.description} title={practice.error.title} />
        ) : null}
        {practice.phase !== "starting" && !showStartError ? (
          <TypingText
            caretIndex={caretIndex}
            characters={characters}
            label={showLive ? practice.passage : sample}
            scrollable={showLive}
          />
        ) : null}
        {practice.phase === "typing" ? (
          <TypingInput
            active
            inputRef={inputRef}
            onBackspace={practice.backspace}
            onInsert={practice.insertText}
          />
        ) : null}
        {showFinishError && practice.error ? (
          <ErrorState description={practice.error.description} title={practice.error.title} />
        ) : null}
      </section>
      <div className="flex flex-wrap items-end gap-6">
        {practice.result ? (
          <TypingStats
            accuracy={practice.result.accuracy}
            correctChars={practice.result.correct_chars}
            incorrectChars={practice.result.incorrect_chars}
            wpm={practice.result.net_wpm}
          />
        ) : liveScore ? (
          <TypingStats accuracy={liveScore.accuracy} progress={liveScore.progress} wpm={liveScore.wpm} />
        ) : practice.phase === "idle" ? (
          <TypingStats accuracy={previewStats.accuracy} wpm={previewStats.wpm} />
        ) : (
          <TypingStats accuracy={0} wpm={0} />
        )}
        <TypingTimer label={practice.result ? "Elapsed" : "Time"} seconds={timerSeconds} />
      </div>
    </div>
  );
}
