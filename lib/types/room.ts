import type { LanguageCode } from "@/lib/constants/languages";

export type RoomSummary = {
  id: string;
  name: string;
  languageCode: LanguageCode;
  playerCount: number;
  capacity: number;
};

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  wpm: number;
  accuracy: number;
};
