"use client";

import { useEffect, type KeyboardEvent, type RefObject } from "react";

type TypingInputProps = {
  active: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onBackspace: () => void;
  onInsert: (text: string) => void;
};

export function TypingInput({ active, inputRef, onBackspace, onInsert }: TypingInputProps) {
  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
    }
  }, [active, inputRef]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!active || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      onBackspace();
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      onInsert(event.key);
    }
  }

  return (
    <textarea
      ref={inputRef}
      aria-label="Typing input"
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      className="sr-only"
      spellCheck={false}
      onInput={(event) => {
        event.currentTarget.value = "";
      }}
      onBeforeInput={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
      onKeyDown={onKeyDown}
      onPaste={(event) => event.preventDefault()}
    />
  );
}
