export type TypingCharState = "pending" | "correct" | "incorrect" | "current";

export type TypingCharacter = {
  char: string;
  state: TypingCharState;
};

export type TypingStatsData = {
  wpm: number;
  accuracy: number;
};
