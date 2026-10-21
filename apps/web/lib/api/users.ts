import { ApiError, apiFetch } from "@/lib/api/http";
import type { LanguageCode } from "@/lib/constants/languages";

export type PreferredLanguage = {
  id: number;
  code: string;
  name: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  preferred_language: PreferredLanguage | null;
  created_at: number;
  updated_at?: number;
  status: string;
};

export type ProgressPoint = {
  id: number;
  net_wpm: number;
  gross_wpm: number;
  accuracy: number;
  duration_seconds: number;
  language_code: string | null;
  language_name: string | null;
  created_at: string | null;
};

export type UserProgress = {
  personal_best_wpm: number;
  average_wpm: number;
  average_accuracy: number;
  total_sessions: number;
  total_races: number;
  recent: ProgressPoint[];
  history: ProgressPoint[];
};

export function getCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/users/me");
}

export function updateProfile(input: {
  username?: string;
  display_name?: string;
}): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export function updatePreferences(languageCode: LanguageCode): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify({ language_code: languageCode }),
  });
}

export function getProgress(): Promise<UserProgress> {
  return apiFetch<UserProgress>("/api/users/me/progress");
}

function messageFrom(body: { message?: unknown } | null, status: number): string {
  const message = body?.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (Array.isArray(message)) {
    const text = message.map(String).filter(Boolean).join(" ");
    if (text) {
      return text;
    }
  }
  return `Request failed (${status})`;
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/users/me/avatar", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      body,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server");
  }

  const payload = (await response.json().catch(() => null)) as (AuthUser & { message?: unknown }) | null;
  if (!response.ok || !payload) {
    throw new ApiError(response.status, messageFrom(payload, response.status));
  }
  return payload;
}

export function removeAvatar(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/users/me/avatar", { method: "DELETE" });
}
