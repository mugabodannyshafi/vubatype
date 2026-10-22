export type RacePhase = "countdown" | "running" | "finished";

export type RacePaceSample = {
  t: number;
  prefix: number;
  incorrect: number;
  typed: number;
};

export type RaceAnalytics = {
  pace: RacePaceSample[];
  correct_keystrokes: number;
  incorrect_keystrokes: number;
  corrections: number;
  personal_best: boolean;
};

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
  analytics?: RaceAnalytics;
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
