"use client";

import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useState } from "react";

import { useTypingLanguage } from "@/components/language/language-provider";
import { TypingStats } from "@/components/typing/typing-stats";
import { TypingText } from "@/components/typing/typing-text";
import { TypingTimer } from "@/components/typing/typing-timer";
import { AppButton } from "@/components/ui/app-button";
import { getLanguageName, TYPING_SAMPLES } from "@/lib/constants/languages";

import { buildTypingPreview, getPreviewStats } from "./preview";

const DURATIONS = [15, 30, 60] as const;
const DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;

type Duration = (typeof DURATIONS)[number];
type Difficulty = (typeof DIFFICULTIES)[number];

function isDuration(value: string): value is `${Duration}` {
  return DURATIONS.some((duration) => String(duration) === value);
}

function isDifficulty(value: string): value is Difficulty {
  return DIFFICULTIES.some((difficulty) => difficulty === value);
}

function readSelection(keys: Iterable<unknown>): string | null {
  const key = [...keys][0];
  return typeof key === "string" ? key : null;
}

export function HomePage() {
  const { language } = useTypingLanguage();
  const sample = TYPING_SAMPLES[language];
  const characters = buildTypingPreview(sample);
  const stats = getPreviewStats(characters);
  const [duration, setDuration] = useState<Duration>(30);
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-10 sm:pt-10">
      <div className="flex max-w-xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          How Fast Can You Type?
        </h1>
        <p className="text-base leading-7 text-muted">
          Compete with friends in Kinyarwanda or English.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <AppButton>Start Typing</AppButton>
        <AppButton variant="secondary">Challenge Friends</AppButton>
      </div>
      <p className="text-sm leading-6 text-muted">
        Race friends on the same passage and see who finishes first.
      </p>
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
            selectedKeys={[String(duration)]}
            selectionMode="single"
            size="sm"
            onSelectionChange={(keys) => {
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
            selectedKeys={[difficulty]}
            selectionMode="single"
            size="sm"
            onSelectionChange={(keys) => {
              const key = readSelection(keys);
              if (key && isDifficulty(key)) {
                setDifficulty(key);
              }
            }}
          >
            {DIFFICULTIES.map((value) => (
              <ToggleButton key={value} id={value}>
                {value}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      </div>
      <section className="rounded-lg border border-border bg-surface px-4 py-5 sm:px-6 sm:py-6">
        <TypingText characters={characters} label={sample} />
      </section>
      <div className="flex flex-wrap items-end gap-6">
        <TypingStats accuracy={stats.accuracy} wpm={stats.wpm} />
        <TypingTimer seconds={duration} />
      </div>
    </div>
  );
}
