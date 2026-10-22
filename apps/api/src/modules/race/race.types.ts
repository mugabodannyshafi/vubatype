import type { RacePaceSample } from './race-progress';

export type { RacePaceSample };

export interface RaceAnalytics {
  pace: RacePaceSample[];
  correct_keystrokes: number;
  incorrect_keystrokes: number;
  corrections: number;
  personal_best: boolean;
}

export interface RaceStanding {
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
}

export interface RaceSync {
  phase: 'countdown' | 'running' | 'finished';
  passage: string;
  typed_text: string;
  starts_at: number;
  deadline_at: number | null;
  server_now: number;
  duration_seconds: number;
  racers: RaceStanding[];
}

export type RaceEmitter = (code: string, event: string, payload: unknown) => void;
