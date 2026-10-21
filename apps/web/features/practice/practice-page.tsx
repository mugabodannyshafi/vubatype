"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorState } from "@/components/feedback/error-state";
import { useTypingLanguage } from "@/components/language/language-provider";
import { TypingInput } from "@/components/typing/typing-input";
import { TypingText } from "@/components/typing/typing-text";
import { useTypingSettingsLock } from "@/components/typing/typing-settings-lock";
import type { PracticeDifficulty, PracticeDuration, StartPracticeInput } from "@/lib/api/practice";
import { buildTypingCharacters, typingCaretIndex } from "@/lib/typing/characters";

import { PracticeLiveHud } from "./practice-live-hud";
import { PracticeResults } from "./practice-results";
import { PracticeToolbar } from "./practice-toolbar";
import { useSoloPractice } from "./use-solo-practice";

export function PracticePage() {
  const { language } = useTypingLanguage();
  const { setLocked } = useTypingSettingsLock();
  const practice = useSoloPractice();
  const { prepare, restart } = practice;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [duration, setDuration] = useState<PracticeDuration>(30);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("medium");
  const settings: StartPracticeInput = useMemo(
    () => ({
      language_code: language,
      difficulty,
      duration_seconds: duration,
    }),
    [difficulty, duration, language],
  );
  const settingsLocked =
    practice.phase === "starting" || practice.phase === "typing" || practice.phase === "finishing";
  const showPassage = practice.passage.length > 0 && practice.phase !== "starting";
  const showResults = practice.phase === "finished" && practice.result !== null;
  const inputActive =
    practice.phase === "ready" ||
    practice.phase === "error" ||
    practice.phase === "starting" ||
    practice.phase === "typing";

  const liveCharacters = useMemo(
    () => buildTypingCharacters(practice.passage, practice.typedText),
    [practice.passage, practice.typedText],
  );
  const caretIndex =
    practice.phase === "typing" || practice.phase === "finishing"
      ? typingCaretIndex(practice.passage.length, practice.typedText.length)
      : practice.phase === "ready"
        ? 0
        : null;

  useEffect(() => {
    setLocked(settingsLocked);
    return () => setLocked(false);
  }, [setLocked, settingsLocked]);

  useEffect(() => {
    void prepare(settings);
  }, [prepare, settings]);

  function reload() {
    restart(settings);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-start gap-8 px-4 pt-6 pb-8 sm:justify-center sm:py-10">
      {practice.error ? (
        <ErrorState description={practice.error.description} title={practice.error.title} />
      ) : null}
      {showResults && practice.result ? (
        <div className="practice-view">
          <PracticeResults
            result={practice.result}
            samples={practice.samples}
            onChangeSettings={reload}
            onTryAgain={reload}
          />
        </div>
      ) : (
        <div className="practice-view flex flex-col gap-8">
          <PracticeToolbar
            difficulty={difficulty}
            duration={duration}
            locked={settingsLocked}
            onDifficultyChange={setDifficulty}
            onDurationChange={setDuration}
            onRestart={reload}
          />
          {practice.phase === "typing" || practice.phase === "finishing" ? (
            <PracticeLiveHud
              durationSeconds={practice.durationSeconds}
              expiresAt={practice.expiresAt}
              passage={practice.passage}
              startedAt={practice.startedAt}
              typedText={practice.typedText}
              onRestart={practice.phase === "typing" ? reload : undefined}
            />
          ) : null}
          <div className="relative">
            {showPassage ? (
              <TypingText caretIndex={caretIndex} characters={liveCharacters} label={practice.passage} />
            ) : practice.phase === "error" ? null : (
              <div className="typing-text typing-text-window flex items-center">
                <p className="text-sm text-muted">Preparing your passage</p>
              </div>
            )}
            {inputActive ? (
              <TypingInput
                active
                inputRef={inputRef}
                mode={practice.phase === "typing" ? "typing" : "ready"}
                onAbandon={reload}
                onBackspace={practice.backspace}
                onBlur={() => {}}
                onFocus={() => {}}
                onInsert={practice.insertText}
                onRestart={reload}
                onStart={practice.startTyping}
              />
            ) : null}
          </div>
          {practice.phase === "ready" ? <p className="text-sm text-muted">Type to start</p> : null}
        </div>
      )}
    </div>
  );
}
