import { apiFetch } from "@/lib/api/http";
import type { LanguageCode } from "@/lib/constants/languages";

export type PracticeDifficulty = "easy" | "medium" | "hard";
export type PracticeDuration = 15 | 30 | 60;
export type PracticeSessionStatus = "active" | "completed" | "expired";

export type PracticePassage = {
  id: number;
  content: string;
  difficulty: PracticeDifficulty;
  character_count: number;
  language: {
    id: number;
    code: string;
    name: string;
  };
};

export type PracticeSession = {
  id: number;
  status: PracticeSessionStatus;
  duration_seconds: number;
  started_at: string | null;
  expires_at: string | null;
  finished_at: string | null;
  passage: PracticePassage;
};

export type PracticeResult = {
  id: number;
  session_id: number | null;
  duration_seconds: number;
  elapsed_time_ms: number;
  gross_wpm: number;
  net_wpm: number;
  accuracy: number;
  correct_chars: number;
  incorrect_chars: number;
  keystrokes_verified: boolean;
  created_at: string | null;
  passage: PracticePassage;
};

export type StartPracticeInput = {
  language_code: LanguageCode;
  difficulty: PracticeDifficulty;
  duration_seconds: PracticeDuration;
};

function asNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeSession(session: PracticeSession): PracticeSession {
  return {
    ...session,
    id: asNumber(session.id),
    duration_seconds: asNumber(session.duration_seconds),
    passage: {
      ...session.passage,
      id: asNumber(session.passage.id),
      character_count: asNumber(session.passage.character_count),
      content: session.passage.content ?? "",
    },
  };
}

function normalizeResult(result: PracticeResult): PracticeResult {
  return {
    ...result,
    id: asNumber(result.id),
    session_id: result.session_id === null ? null : asNumber(result.session_id),
    duration_seconds: asNumber(result.duration_seconds),
    elapsed_time_ms: asNumber(result.elapsed_time_ms),
    gross_wpm: asNumber(result.gross_wpm),
    net_wpm: asNumber(result.net_wpm),
    accuracy: asNumber(result.accuracy),
    correct_chars: asNumber(result.correct_chars),
    incorrect_chars: asNumber(result.incorrect_chars),
  };
}

export async function startPracticeSession(input: StartPracticeInput): Promise<PracticeSession> {
  const session = await apiFetch<PracticeSession>("/api/v1/practice/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeSession(session);
}

export async function finishPracticeSession(id: number, typedText: string): Promise<PracticeResult> {
  const result = await apiFetch<PracticeResult>(`/api/v1/practice/sessions/${id}/finish`, {
    method: "POST",
    body: JSON.stringify({ typed_text: typedText }),
  });
  return normalizeResult(result);
}
