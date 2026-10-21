import type { TypingCharacter, TypingStatsData } from "@/lib/types/typing";

const PREVIEW_INDEX = 11;
const PREVIEW_ELAPSED_SECONDS = 6;

export function buildTypingPreview(text: string): TypingCharacter[] {
  return Array.from(text).map((char, index) => {
    if (index < PREVIEW_INDEX - 1) {
      return { char, state: "correct" };
    }
    if (index === PREVIEW_INDEX - 1) {
      return { char, state: "incorrect" };
    }
    if (index === PREVIEW_INDEX) {
      return { char, state: "current" };
    }
    return { char, state: "pending" };
  });
}

export function getPreviewStats(characters: TypingCharacter[]): TypingStatsData {
  const correct = characters.filter((character) => character.state === "correct").length;
  const incorrect = characters.filter((character) => character.state === "incorrect").length;
  const typed = correct + incorrect;
  const accuracy = typed === 0 ? 100 : (correct / typed) * 100;
  const wpm = correct / 5 / (PREVIEW_ELAPSED_SECONDS / 60);

  return { wpm, accuracy };
}
