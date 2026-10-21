"use client";

import { useEffect, useRef } from "react";

import type { TypingCharacter, TypingCharState } from "@/lib/types/typing";

const STATE_CLASS: Record<TypingCharState, string> = {
  pending: "text-typing-pending",
  correct: "text-typing-correct",
  incorrect: "typing-char-incorrect text-typing-incorrect underline decoration-typing-incorrect",
  current: "typing-char-current text-foreground",
};

type TypingTextProps = {
  characters: TypingCharacter[];
  caretIndex?: number | null;
  label?: string;
  scrollable?: boolean;
};

export function TypingText({
  characters,
  caretIndex = null,
  label = "Typing text",
  scrollable = false,
}: TypingTextProps) {
  const caretRef = useRef<HTMLSpanElement>(null);
  const passage = characters.map((character) => character.char).join("");
  const trailingCaret = caretIndex === characters.length;

  useEffect(() => {
    const caret = caretRef.current;
    const panel = caret?.closest(".typing-text-scroll");
    if (!caret || !(panel instanceof HTMLElement)) {
      return;
    }

    const caretRect = caret.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    if (caretRect.bottom > panelRect.bottom) {
      panel.scrollTop += caretRect.bottom - panelRect.bottom;
    } else if (caretRect.top < panelRect.top) {
      panel.scrollTop -= panelRect.top - caretRect.top;
    }
  }, [caretIndex, characters]);

  return (
    <p aria-label={label} className={scrollable ? "typing-text typing-text-scroll" : "typing-text"}>
      <span className="sr-only">{passage}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => {
          const showCaret = caretIndex === null ? character.state === "current" : index === caretIndex;
          return (
            <span
              key={index}
              ref={showCaret ? caretRef : undefined}
              className={`relative ${STATE_CLASS[character.state]}`}
            >
              {showCaret ? <span className="typing-caret" /> : null}
              {character.char}
            </span>
          );
        })}
        {trailingCaret ? (
          <span ref={caretRef} className="relative inline-block w-0">
            <span className="typing-caret" />
          </span>
        ) : null}
      </span>
    </p>
  );
}
