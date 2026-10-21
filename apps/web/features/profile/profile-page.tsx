"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PlayerAvatar } from "@/components/player/player-avatar";
import { AppButton } from "@/components/ui/app-button";
import { ApiError } from "@/lib/api/http";
import { getProgress, type UserProgress } from "@/lib/api/users";

import { ProgressChart } from "./progress-chart";

function formatJoined(createdAt: number): string {
  if (!Number.isFinite(createdAt)) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(createdAt * 1000);
}

function formatMetric(value: number, digits = 0): string {
  return digits === 0 ? String(Math.round(value)) : value.toFixed(digits);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-2 font-mono text-3xl leading-none text-foreground tabular-nums">{value}</dd>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setProgressLoading(true);
    getProgress()
      .then((next) => {
        if (!cancelled) {
          setProgress(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Could not load your progress");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProgressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <LoadingState label="Loading your profile" />
      </div>
    );
  }

  const name = user.display_name || user.username;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-wrap items-center gap-4">
        <PlayerAvatar avatarUrl={user.avatar_url ?? undefined} name={name} size="md" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-muted">@{user.username}</p>
          <p className="mt-1 text-sm text-muted">Joined {formatJoined(user.created_at)}</p>
        </div>
      </header>

      {progressLoading ? <LoadingState label="Loading your results" /> : null}
      {error ? <ErrorState title="Could not load progress" description={error} /> : null}

      {progress ? (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Best WPM" value={formatMetric(progress.personal_best_wpm)} />
            <StatCard label="Average WPM" value={formatMetric(progress.average_wpm, 1)} />
            <StatCard
              label="Accuracy"
              value={`${formatMetric(progress.average_accuracy, 1)}%`}
            />
            <StatCard label="Sessions" value={String(progress.total_sessions)} />
            <StatCard label="Races" value={String(progress.total_races)} />
          </dl>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-muted uppercase">Progress</h2>
            <div className="rounded-lg border border-border bg-surface px-4 py-4">
              <ProgressChart points={progress.history} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-muted uppercase">Recent tests</h2>
            {progress.recent.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface">
                <EmptyState
                  title="No practice sessions yet"
                  description="Finish a solo test and it will show up here."
                />
                <div className="flex justify-center pb-6">
                  <AppButton onPress={() => router.push("/practice")}>Start practice</AppButton>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {progress.recent.map((result) => (
                  <li key={result.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-lg leading-none tabular-nums">
                        {Math.round(result.net_wpm)} WPM
                      </p>
                      <p className="mt-1 truncate text-sm text-muted">
                        {result.language_name ?? "Practice"}
                        {result.created_at ? ` · ${result.created_at}` : ""}
                      </p>
                    </div>
                    <p className="font-mono text-sm tabular-nums">{result.accuracy.toFixed(1)}%</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
