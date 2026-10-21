import type { TypingCharacter } from "@/lib/types/typing";

export function buildTypingCharacters(passage: string, typedText: string): TypingCharacter[] {
  const characters: TypingCharacter[] = [];

  for (let index = 0; index < passage.length; index += 1) {
    const char = passage[index] ?? "";
    if (index < typedText.length) {
      characters.push({
        char,
        state: typedText[index] === char ? "correct" : "incorrect",
      });
      continue;
    }

    characters.push({
      char,
      state: index === typedText.length ? "current" : "pending",
    });
  }

  return characters;
}

export function typingCaretIndex(passageLength: number, typedLength: number): number {
  return Math.min(Math.max(typedLength, 0), passageLength);
}
