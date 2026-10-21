"use client";

import { useEffect, type FocusEvent, type KeyboardEvent, type RefObject } from "react";

type TypingInputMode = "ready" | "typing";

type TypingInputProps = {
  active: boolean;
  mode: TypingInputMode;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onAbandon: () => void;
  onBackspace: () => void;
  onBlur: () => void;
  onFocus: () => void;
  onInsert: (text: string) => void;
  onRestart: () => void;
  onStart: (text: string) => void;
  restoreFocus?: boolean;
};

export function TypingInput({
  active,
  mode,
  inputRef,
  onAbandon,
  onBackspace,
  onBlur,
  onFocus,
  onInsert,
  onRestart,
  onStart,
  restoreFocus = false,
}: TypingInputProps) {
  useEffect(() => {
    if (!active) {
      return;
    }

    const input = inputRef.current;
    input?.focus({ preventScroll: true });
    if (restoreFocus) {
      return;
    }

    const bringIntoView = () => {
      const stage = input?.parentElement;
      if (!stage) {
        return;
      }

      const rect = stage.getBoundingClientRect();
      const visibleBottom = window.visualViewport?.height ?? window.innerHeight;
      if (rect.bottom > visibleBottom - 8 || rect.top < 8) {
        stage.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };

    bringIntoView();
    window.visualViewport?.addEventListener("resize", bringIntoView);
    return () => window.visualViewport?.removeEventListener("resize", bringIntoView);
  }, [active, inputRef, restoreFocus]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!active || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (mode === "typing") {
        onAbandon();
      } else {
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      onRestart();
      return;
    }

    if (mode === "ready") {
      if (event.key.length === 1) {
        event.preventDefault();
        onStart(event.key);
      }
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
      className="absolute inset-0 z-10 resize-none bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none"
      inputMode="text"
      spellCheck={false}
      onBeforeInput={(event) => event.preventDefault()}
      onBlur={(event: FocusEvent<HTMLTextAreaElement>) => {
        event.currentTarget.value = "";
        onBlur();
        if (!restoreFocus) {
          return;
        }
        window.requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true });
        });
      }}
      onDrop={(event) => event.preventDefault()}
      onFocus={onFocus}
      onInput={(event) => {
        event.currentTarget.value = "";
      }}
      onKeyDown={onKeyDown}
      onPaste={(event) => event.preventDefault()}
    />
  );
}
