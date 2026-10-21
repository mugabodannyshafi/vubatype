import { ApiError, apiFetch } from "@/lib/api/http";

export type GuestProfile = {
  id: number;
  nickname: string;
  created_at: string | null;
  expires_at: string | null;
  last_seen_at: string | null;
};

function createGuestNickname(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  const suffix = (value % 10000).toString().padStart(4, "0");
  return `Guest${suffix}`;
}

async function createGuest(): Promise<GuestProfile> {
  return apiFetch<GuestProfile>("/api/v1/guests", {
    method: "POST",
    body: JSON.stringify({ nickname: createGuestNickname() }),
  });
}

export async function ensureGuestSession(): Promise<GuestProfile> {
  try {
    return await apiFetch<GuestProfile>("/api/v1/guests/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return createGuest();
    }
    throw error;
  }
}
