"use client";

import { ToggleButton, ToggleButtonGroup } from "@heroui/react";

import { useTypingLanguage } from "@/components/language/language-provider";
import { AppButton } from "@/components/ui/app-button";
import type { PracticeDifficulty, PracticeDuration } from "@/lib/api/practice";
import { LANGUAGES, type LanguageCode } from "@/lib/constants/languages";

const DURATIONS = [15, 30, 60] as const satisfies readonly PracticeDuration[];
const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const satisfies ReadonlyArray<{ value: PracticeDifficulty; label: string }>;

type PracticeToolbarProps = {
  difficulty: PracticeDifficulty;
  duration: PracticeDuration;
  locked: boolean;
  onDifficultyChange: (difficulty: PracticeDifficulty) => void;
  onDurationChange: (duration: PracticeDuration) => void;
  onRestart: () => void;
};

function readSelection(keys: Iterable<unknown>): string | null {
  const key = [...keys][0];
  return typeof key === "string" ? key : null;
}

function isDuration(value: string): value is `${PracticeDuration}` {
  return DURATIONS.some((duration) => String(duration) === value);
}

function isDifficulty(value: string): value is PracticeDifficulty {
  return DIFFICULTIES.some((difficulty) => difficulty.value === value);
}

function isLanguage(value: string): value is LanguageCode {
  return value === "rw" || value === "en";
}

export function PracticeToolbar({
  difficulty,
  duration,
  locked,
  onDifficultyChange,
  onDurationChange,
  onRestart,
}: PracticeToolbarProps) {
  const { language, setLanguage } = useTypingLanguage();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <ToggleButtonGroup
        aria-label="Language"
        disallowEmptySelection
        isDisabled={locked}
        selectedKeys={[language]}
        selectionMode="single"
        size="sm"
        onSelectionChange={(keys) => {
          if (locked) {
            return;
          }
          const key = readSelection(keys);
          if (key && isLanguage(key)) {
            setLanguage(key);
          }
        }}
      >
        {LANGUAGES.map((option) => (
          <ToggleButton key={option.code} id={option.code}>
            {option.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        aria-label="Duration"
        disallowEmptySelection
        isDisabled={locked}
        selectedKeys={[String(duration)]}
        selectionMode="single"
        size="sm"
        onSelectionChange={(keys) => {
          if (locked) {
            return;
          }
          const key = readSelection(keys);
          if (key && isDuration(key)) {
            onDurationChange(Number(key) as PracticeDuration);
          }
        }}
      >
        {DURATIONS.map((value) => (
          <ToggleButton key={value} id={String(value)}>
            {value}s
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        aria-label="Difficulty"
        disallowEmptySelection
        isDisabled={locked}
        selectedKeys={[difficulty]}
        selectionMode="single"
        size="sm"
        onSelectionChange={(keys) => {
          if (locked) {
            return;
          }
          const key = readSelection(keys);
          if (key && isDifficulty(key)) {
            onDifficultyChange(key);
          }
        }}
      >
        {DIFFICULTIES.map((option) => (
          <ToggleButton key={option.value} id={option.value}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <AppButton
        aria-keyshortcuts="Tab"
        className="sm:ml-auto"
        isDisabled={locked}
        size="sm"
        variant="ghost"
        onPress={onRestart}
      >
        Restart
      </AppButton>
    </div>
  );
}
