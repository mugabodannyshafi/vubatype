"use client";

import { useState } from "react";

import { PlayerAvatar } from "@/components/player/player-avatar";
import { AppButton } from "@/components/ui/app-button";
import { hasRacePaceChart, peakRaceWpm, racePaceConsistency } from "@/lib/race/pace";
import type { RaceRacer, RoomYou } from "@/lib/race/types";
import { buildTypingCharacters } from "@/lib/typing/characters";
import type { TypingCharState } from "@/lib/types/typing";

import { RacePaceChart } from "./race-pace-chart";
import type { PendingAction } from "./use-race-room";

type RaceResultsProps = {
  onLeave: () => void;
  onRematch: () => void;
  passage: string;
  pending: PendingAction | null;
  racers: RaceRacer[];
  typedText: string;
  you: RoomYou | null;
};

const REVIEW_CLASS: Record<TypingCharState, string> = {
  pending: "text-typing-pending",
  correct: "text-typing-correct",
  incorrect: "typing-char-incorrect text-typing-incorrect underline decoration-typing-incorrect",
  current: "text-typing-pending",
};

function formatTime(ms: number | null): string {
  if (ms == null) {
    return "—";
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function resultSummary(winner: RaceRacer | undefined, mine: RaceRacer | undefined): string {
  if (!mine) {
    return winner?.finished ? `${winner.nickname} wins on VubaType` : "Race finished on VubaType";
  }

  return `I finished #${mine.rank} on VubaType · ${Math.round(mine.wpm)} WPM · ${mine.accuracy.toFixed(1)}% accuracy`;
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 32 32">
      <path
        d="M11 5h10v3.2c0 2.7-2 4.9-4.6 5.3V17h2.8v2H12.8v-2H15.6v-3.5C13 13.1 11 10.9 11 8.2V5Z"
        fill="currentColor"
      />
      <path
        d="M11 7H8.4A2.6 2.6 0 0 0 11 10.2V7ZM21 7h2.6A2.6 2.6 0 0 1 21 10.2V7Z"
        fill="currentColor"
      />
      <path d="M13 21h6v2h-6v-2ZM11.5 25h9v2h-9v-2Z" fill="currentColor" />
    </svg>
  );
}

export function RaceResults({
  onLeave,
  onRematch,
  passage,
  pending,
  racers,
  typedText,
  you,
}: RaceResultsProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const ordered = [...racers].sort((left, right) => left.rank - right.rank);
  const winner = ordered[0];
  const mine = you ? ordered.find((racer) => racer.guest_id === you.id) : undefined;
  const title = winner?.finished ? `${winner.nickname} wins` : "Time's up";
  const analytics = mine?.analytics;
  const pace = analytics?.pace ?? [];
  const showChart = analytics != null && hasRacePaceChart(pace);
  const peak = showChart ? peakRaceWpm(pace) : null;
  const consistency = analytics ? racePaceConsistency(pace) : null;
  const review = passage.length > 0 ? buildTypingCharacters(passage, typedText) : [];
  const mistakes = review.filter((character) => character.state === "incorrect").length;

  async function shareResults() {
    try {
      await navigator.clipboard.writeText(resultSummary(winner, mine));
      setShareError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      setShareError(true);
    }
  }

  return (
    <div className="race-results flex flex-col gap-8">
      <div className="flex items-center gap-4">
        {winner?.finished ? <TrophyIcon className="race-trophy size-12 shrink-0 text-accent" /> : null}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Results</p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
        </div>
      </div>

      {mine ? (
        <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">Your result</h2>
            {analytics?.personal_best ? (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-link">
                Personal best
              </span>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5">
            <Stat label="Place" value={`#${mine.rank}`} />
            <Stat label="WPM" value={String(Math.round(mine.wpm))} />
            <Stat label="Accuracy" value={`${mine.accuracy.toFixed(1)}%`} />
            <Stat label="Done" value={`${Math.round(mine.progress)}%`} />
            <Stat label="Time" value={formatTime(mine.completion_time_ms)} />
          </dl>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
        <ol className="overflow-hidden rounded-lg border border-border bg-surface">
          <li className="hidden grid-cols-[2.75rem_minmax(0,1.6fr)_repeat(5,minmax(4.25rem,0.7fr))] gap-3 border-b border-border px-3 py-2 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
            <span>#</span>
            <span>Player</span>
            <span>WPM</span>
            <span>Accuracy</span>
            <span>Done</span>
            <span>Time</span>
            <span>Status</span>
          </li>
          {ordered.map((racer) => {
            const isYou = racer.guest_id === you?.id;
            const isWinner = racer.rank === 1 && racer.finished;
            return (
              <li
                key={racer.guest_id}
                className={[
                  "flex flex-col gap-3 border-b border-border px-3 py-3 last:border-b-0 sm:grid sm:grid-cols-[2.75rem_minmax(0,1.6fr)_repeat(5,minmax(4.25rem,0.7fr))] sm:items-center sm:gap-3",
                  isYou ? "bg-accent/10" : "",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-3 sm:contents">
                  <span className="w-7 font-mono text-sm text-muted tabular-nums sm:w-auto">{racer.rank}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <PlayerAvatar avatarUrl={racer.avatar_url ?? undefined} name={racer.nickname} />
                    {isWinner ? <TrophyIcon className="size-3.5 shrink-0 text-accent" /> : null}
                    <span className="truncate text-sm font-medium text-foreground">
                      {racer.nickname}
                      {isYou ? <span className="text-muted"> · you</span> : null}
                    </span>
                  </span>
                  <span
                    className={[
                      "text-xs font-medium tracking-wide uppercase sm:hidden",
                      racer.finished ? "text-link" : "text-muted",
                    ].join(" ")}
                  >
                    {racer.finished ? "Finished" : "DNF"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:contents">
                  <LeaderStat label="WPM" value={`${Math.round(racer.wpm)}`} />
                  <LeaderStat label="Accuracy" value={`${racer.accuracy.toFixed(0)}%`} />
                  <LeaderStat label="Done" value={`${Math.round(racer.progress)}%`} />
                  <LeaderStat label="Time" value={formatTime(racer.completion_time_ms)} />
                  <LeaderStat label="Status" value={racer.finished ? "Finished" : "DNF"} desktopOnly />
                </dl>
              </li>
            );
          })}
        </ol>
      </section>

      {mine && analytics ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-foreground">Performance</h2>
          {showChart ? (
            <RacePaceChart samples={pace} />
          ) : (
            <p className="text-sm text-muted">Not enough pace data for a chart.</p>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Stat label="Accuracy" value={`${mine.accuracy.toFixed(1)}%`} />
            {showChart ? <Stat label="Average WPM" value={String(Math.round(mine.wpm))} /> : null}
            {peak != null ? <Stat label="Peak WPM" value={String(Math.round(peak))} /> : null}
            {consistency != null ? (
              <Stat label="Consistency" value={`${Math.round(consistency)}%`} />
            ) : null}
            <Stat label="Correct keys" value={String(analytics.correct_keystrokes)} />
            <Stat label="Incorrect keys" value={String(analytics.incorrect_keystrokes)} />
            <Stat label="Corrections" value={String(analytics.corrections)} />
          </dl>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Typing review</h2>
        {review.length === 0 ? (
          <p className="text-sm text-muted">Typing review isn&apos;t available for this race.</p>
        ) : (
          <>
            <p className="font-mono text-base leading-relaxed wrap-break-word whitespace-pre-wrap text-foreground sm:text-lg">
              <span className="sr-only">{passage}</span>
              <span aria-hidden="true">
                {review.map((character, index) => (
                  <span
                    key={index}
                    className={
                      character.state === "current" ? REVIEW_CLASS.pending : REVIEW_CLASS[character.state]
                    }
                  >
                    {character.char}
                  </span>
                ))}
              </span>
            </p>
            <dl className="flex flex-wrap gap-x-8 gap-y-4">
              <Stat label="Mistakes" value={String(mistakes)} compact />
              {analytics ? <Stat label="Corrections" value={String(analytics.corrections)} compact /> : null}
            </dl>
          </>
        )}
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          {you?.is_host ? (
            <AppButton
              isDisabled={pending != null && pending !== "rematch"}
              isPending={pending === "rematch"}
              onPress={onRematch}
            >
              Race again
            </AppButton>
          ) : null}
          <AppButton variant="secondary" onPress={() => void shareResults()}>
            {copied ? "Copied" : "Share"}
          </AppButton>
          <AppButton
            isDisabled={pending != null && pending !== "leave"}
            isPending={pending === "leave"}
            variant={you?.is_host ? "ghost" : "primary"}
            onPress={onLeave}
          >
            Leave
          </AppButton>
        </div>
        {shareError ? (
          <p className="text-sm text-danger" role="alert">
            Could not copy the race summary.
          </p>
        ) : null}
        {you && !you.is_host ? (
          <p className="text-sm text-muted">The host can bring everyone back to the lobby for another race.</p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd
        className={
          compact
            ? "font-mono text-lg text-foreground tabular-nums"
            : "font-mono text-3xl leading-none text-foreground tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function LeaderStat({
  label,
  value,
  desktopOnly = false,
}: {
  label: string;
  value: string;
  desktopOnly?: boolean;
}) {
  return (
    <div className={desktopOnly ? "hidden sm:block" : "flex flex-col gap-0.5 sm:block"}>
      <dt className="text-xs font-medium tracking-wide text-muted uppercase sm:sr-only">{label}</dt>
      <dd
        className={[
          "font-mono text-sm tabular-nums",
          label === "Status" ? (value === "Finished" ? "text-link" : "text-muted") : "text-foreground",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
