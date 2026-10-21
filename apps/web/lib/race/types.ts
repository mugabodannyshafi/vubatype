export type RacePhase = "countdown" | "running" | "finished";

export type RaceRacer = {
  guest_id: number;
  nickname: string;
  avatar_url: string | null;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  rank: number;
  disconnected: boolean;
  completion_time_ms: number | null;
};

export type RaceSync = {
  phase: RacePhase;
  passage: string;
  typed_text: string;
  starts_at: number;
  deadline_at: number | null;
  server_now: number;
  duration_seconds: number;
  racers: RaceRacer[];
};

export type RoomYou = {
  id: number;
  is_host: boolean;
  is_ready: boolean;
};
