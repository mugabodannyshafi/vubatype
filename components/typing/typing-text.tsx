import type { TypingCharacter, TypingCharState } from "@/lib/types/typing";

const STATE_CLASS: Record<TypingCharState, string> = {
  pending: "text-typing-pending",
  correct: "text-typing-correct",
  incorrect:
    "typing-char-incorrect text-typing-incorrect underline decoration-typing-incorrect",
  current: "typing-char-current text-typing-correct",
};

type TypingTextProps = {
  characters: TypingCharacter[];
  label?: string;
};

export function TypingText({ characters, label = "Typing text" }: TypingTextProps) {
  const passage = characters.map((character) => character.char).join("");

  return (
    <p aria-label={label} className="typing-text">
      <span className="sr-only">{passage}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => (
          <span
            key={`${character.char}-${index}`}
            className={`relative ${STATE_CLASS[character.state]}`}
          >
            {character.state === "current" ? <span className="typing-caret" /> : null}
            {character.char}
          </span>
        ))}
      </span>
    </p>
  );
}
