"use client";

import { memo, useEffect, useRef } from "react";

import type { TypingCharacter, TypingCharState } from "@/lib/types/typing";

const STATE_CLASS: Record<TypingCharState, string> = {
  pending: "text-typing-pending",
  correct: "text-typing-correct",
  incorrect: "typing-char-incorrect text-typing-incorrect underline decoration-typing-incorrect",
  current: "text-typing-pending",
};

type TypingTextProps = {
  characters: TypingCharacter[];
  caretIndex?: number | null;
  label?: string;
  contained?: boolean;
};

export const TypingText = memo(function TypingText({
  characters,
  caretIndex = null,
  label = "Typing text",
  contained = true,
}: TypingTextProps) {
  const caretRef = useRef<HTMLSpanElement>(null);
  const passage = characters.map((character) => character.char).join("");
  const trailingCaret = caretIndex === characters.length;

  useEffect(() => {
    const caret = caretRef.current;
    const panel = caret?.closest(".typing-text-window");
    if (!caret || !(panel instanceof HTMLElement)) {
      return;
    }

    const lineHeight = Number.parseFloat(getComputedStyle(panel).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
      return;
    }

    const caretTop = caret.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
    panel.scrollTop = Math.max(0, caretTop - lineHeight);
  }, [caretIndex, characters]);

  return (
      <p aria-label={label} className={contained ? "typing-text typing-text-window" : "typing-text"}>
      <span className="sr-only">{passage}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => {
          const showCaret = index === caretIndex;
          return (
            <span key={index} className={`relative ${STATE_CLASS[character.state]}`}>
              {showCaret ? <span ref={caretRef} className="typing-caret" /> : null}
              {character.char}
            </span>
          );
        })}
        {trailingCaret ? (
          <span className="relative inline-block w-0">
            <span ref={caretRef} className="typing-caret" />
          </span>
        ) : null}
      </span>
    </p>
  );
});
