import { apiFetch } from "@/lib/api/http";
import type { LanguageCode } from "@/lib/constants/languages";

export type RaceDifficulty = "easy" | "medium" | "hard";
export type RaceDuration = 15 | 30 | 60;

export type RoomGuest = {
  id: number;
  nickname: string;
  avatar_url: string | null;
};

export type RoomPlayer = {
  id: number;
  is_host: boolean;
  is_ready: boolean;
  connected?: boolean;
  joined_at: string | null;
  guest: RoomGuest;
};

export type RoomView = {
  id: number;
  code: string;
  status: "waiting" | "countdown" | "racing" | "finished" | "expired";
  host: RoomGuest;
  settings: {
    language: { id: number; code: string; name: string };
    difficulty: RaceDifficulty;
    duration_seconds: number;
    max_players: number;
  };
  players: RoomPlayer[];
  created_at: string | null;
  expires_at: string | null;
};

export type CreateRoomInput = {
  language_code: LanguageCode;
  difficulty: RaceDifficulty;
  duration_seconds: RaceDuration;
  max_players?: number;
};

export type RealtimeTicket = {
  token: string;
  expires_at: string;
};

export function raceSocketOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
  return configured.replace(/\/$/, "");
}

export async function createRoom(input: CreateRoomInput): Promise<RoomView> {
  return apiFetch<RoomView>("/api/v1/rooms", {
    method: "POST",
    body: JSON.stringify({ max_players: 8, ...input }),
  });
}

export async function issueRealtimeTicket(): Promise<RealtimeTicket> {
  return apiFetch<RealtimeTicket>("/api/v1/realtime/ticket", { method: "POST" });
}
