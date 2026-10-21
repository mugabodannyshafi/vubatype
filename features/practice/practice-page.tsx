"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorState } from "@/components/feedback/error-state";
import { useTypingLanguage } from "@/components/language/language-provider";
import { TypingInput } from "@/components/typing/typing-input";
import { TypingText } from "@/components/typing/typing-text";
import { useTypingSettingsLock } from "@/components/typing/typing-settings-lock";
import type { PracticeDifficulty, PracticeDuration } from "@/lib/api/practice";
import { TYPING_SAMPLES } from "@/lib/constants/languages";
import { buildTypingCharacters, typingCaretIndex } from "@/lib/typing/characters";
import type { TypingCharacter } from "@/lib/types/typing";

import { PracticeLiveHud } from "./practice-live-hud";
import { PracticeResults } from "./practice-results";
import { PracticeToolbar } from "./practice-toolbar";
import { useSoloPractice } from "./use-solo-practice";

export function PracticePage() {
  const { language } = useTypingLanguage();
  const { setLocked } = useTypingSettingsLock();
  const practice = useSoloPractice();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [duration, setDuration] = useState<PracticeDuration>(30);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("medium");
  const [inputFocused, setInputFocused] = useState(false);
  const sample = TYPING_SAMPLES[language];
  const settingsLocked =
    practice.phase === "starting" || practice.phase === "typing" || practice.phase === "finishing";
  const hasPassage = practice.passage.length > 0;
  const showLive = hasPassage && practice.phase !== "idle" && practice.phase !== "starting";
  const showResults = practice.phase === "finished" && practice.result !== null;
  const showToolbar = practice.phase === "idle" || practice.phase === "starting" || practice.phase === "error";
  const inputActive =
    practice.phase === "idle" ||
    practice.phase === "error" ||
    practice.phase === "starting" ||
    practice.phase === "typing";

  const sampleCharacters = useMemo<TypingCharacter[]>(
    () => Array.from(sample).map((char) => ({ char, state: "pending" })),
    [sample],
  );
  const liveCharacters = useMemo(
    () => (showLive ? buildTypingCharacters(practice.passage, practice.typedText) : sampleCharacters),
    [practice.passage, practice.typedText, sampleCharacters, showLive],
  );
  const caretIndex =
    practice.phase === "typing" || practice.phase === "finishing"
      ? typingCaretIndex(practice.passage.length, practice.typedText.length)
      : inputFocused && !showLive
        ? 0
        : null;

  useEffect(() => {
    setLocked(settingsLocked);
    return () => setLocked(false);
  }, [setLocked, settingsLocked]);

  useEffect(() => {
    const root = document.documentElement;
    if (practice.phase === "typing") {
      root.dataset.immersive = "true";
    } else {
      delete root.dataset.immersive;
    }

    return () => {
      delete root.dataset.immersive;
    };
  }, [practice.phase]);

  function begin() {
    void practice.start({
      language_code: language,
      difficulty,
      duration_seconds: duration,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-start gap-8 px-4 pt-6 pb-8 sm:justify-center sm:py-10">
      {showToolbar ? (
        <PracticeToolbar
          difficulty={difficulty}
          duration={duration}
          locked={settingsLocked}
          onDifficultyChange={setDifficulty}
          onDurationChange={setDuration}
          onRestart={begin}
        />
      ) : null}
      {practice.error ? (
        <ErrorState description={practice.error.description} title={practice.error.title} />
      ) : null}
      {showResults && practice.result ? (
        <div className="practice-view">
          <PracticeResults
            result={practice.result}
            samples={practice.samples}
            onChangeSettings={practice.abandon}
            onTryAgain={begin}
          />
        </div>
      ) : (
        <div className="practice-view flex flex-col gap-8">
          {practice.phase === "typing" || practice.phase === "finishing" ? (
            <PracticeLiveHud
              durationSeconds={practice.durationSeconds}
              expiresAt={practice.expiresAt}
              passage={practice.passage}
              startedAt={practice.startedAt}
              typedText={practice.typedText}
              onRestart={practice.phase === "typing" ? begin : undefined}
            />
          ) : null}
          <div className="relative">
            {practice.phase === "starting" ? (
              <div className="typing-text typing-text-window flex items-center">
                <p className="text-sm text-muted">Preparing your passage</p>
              </div>
            ) : (
              <TypingText
                caretIndex={caretIndex}
                characters={liveCharacters}
                label={showLive ? practice.passage : sample}
              />
            )}
            {inputActive ? (
              <TypingInput
                active
                inputRef={inputRef}
                mode={practice.phase === "typing" ? "typing" : "ready"}
                onAbandon={practice.abandon}
                onBackspace={practice.backspace}
                onBlur={() => setInputFocused(false)}
                onFocus={() => setInputFocused(true)}
                onInsert={practice.insertText}
                onRestart={begin}
                onStart={begin}
              />
            ) : null}
          </div>
          {practice.phase === "idle" || practice.phase === "error" ? (
            <p className="text-sm text-muted">Type to start</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
