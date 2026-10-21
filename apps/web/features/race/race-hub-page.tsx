"use client";

import { Card } from "@heroui/react";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/feedback/error-state";
import { useTypingLanguage } from "@/components/language/language-provider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextField } from "@/components/ui/app-text-field";
import { ApiError } from "@/lib/api/http";
import { ensureGuestSession } from "@/lib/api/guests";
import { createRoom, type RaceDifficulty } from "@/lib/api/rooms";
import { LANGUAGES, type LanguageCode } from "@/lib/constants/languages";
import { RACE_LIMITS } from "@/lib/race/progress";

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const satisfies ReadonlyArray<{ value: RaceDifficulty; label: string }>;

function readSelection(keys: Iterable<unknown>): string | null {
  const key = [...keys][0];
  return typeof key === "string" ? key : null;
}

function isDifficulty(value: string): value is RaceDifficulty {
  return DIFFICULTIES.some((difficulty) => difficulty.value === value);
}

function isLanguage(value: string): value is LanguageCode {
  return value === "rw" || value === "en";
}

export function RaceHubPage() {
  const router = useRouter();
  const { language, setLanguage } = useTypingLanguage();
  const [difficulty, setDifficulty] = useState<RaceDifficulty>("medium");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setCreating(true);
    setError(null);
    try {
      await ensureGuestSession();
      const room = await createRoom({
        language_code: language,
        difficulty,
      });
      router.push(`/rooms/${room.code}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the room.");
      setCreating(false);
    }
  }

  function onJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 8) {
      setError("Enter the 8-character room code.");
      return;
    }
    setError(null);
    router.push(`/rooms/${code}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-16 sm:pt-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Race with friends</h1>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Open a private room, share the code, and race the same passage together.
        </p>
      </div>
      {error ? <ErrorState description={error} title="Could not continue" /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Title>Create a room</Card.Title>
            <Card.Description>You will be the host.</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <ToggleButtonGroup
              aria-label="Language"
              disallowEmptySelection
              selectedKeys={[language]}
              selectionMode="single"
              size="sm"
              onSelectionChange={(keys) => {
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
              {DIFFICULTIES.map((option) => (
                <ToggleButton key={option.value} id={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <p className="text-sm text-muted">
              {RACE_LIMITS[difficulty].minWords}–{RACE_LIMITS[difficulty].maxWords} words ·{" "}
              {RACE_LIMITS[difficulty].maxSeconds}s limit
            </p>
          </Card.Content>
          <Card.Footer>
            <AppButton isDisabled={creating} onPress={() => void onCreate()}>
              {creating ? "Creating" : "Create room"}
            </AppButton>
          </Card.Footer>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Join with a code</Card.Title>
            <Card.Description>Use the code or the invite link from your friend.</Card.Description>
          </Card.Header>
          <Card.Content>
            <AppTextField
              label="Room code"
              value={joinCode}
              onChange={(value) => setJoinCode(value.toUpperCase())}
              placeholder="AB7K2QMN"
            />
          </Card.Content>
          <Card.Footer>
            <AppButton variant="secondary" onPress={onJoin}>
              Join room
            </AppButton>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}
