"use client";

import { useCallback, useEffect, useRef } from "react";

import { installSoundGestureListener, playTypingSound } from "@/lib/sound/engine";

export type TypingFinishRule = "exact" | "length";

function isInFlight(local: string, external: string): boolean {
  return (
    (local.startsWith(external) && local.length > external.length) ||
    (external.startsWith(local) && external.length > local.length)
  );
}

export function useTypingSound(passage: string, typedText: string, finishOn: TypingFinishRule) {
  const passageRef = useRef(passage);
  const typedRef = useRef(typedText);
  const finishedRef = useRef(false);

  useEffect(() => {
    installSoundGestureListener();
  }, []);

  useEffect(() => {
    if (passageRef.current !== passage) {
      passageRef.current = passage;
      typedRef.current = typedText;
      finishedRef.current = false;
      return;
    }

    const local = typedRef.current;
    if (local === typedText || isInFlight(local, typedText)) {
      return;
    }

    typedRef.current = typedText;
    if (typedText.length < passage.length) {
      finishedRef.current = false;
    }
  }, [passage, typedText]);

  const insert = useCallback(
    (text: string, commit: (text: string) => void) => {
      const currentPassage = passageRef.current;
      const currentTyped = typedRef.current;
      const accepted = text.length === 1 && currentTyped.length < currentPassage.length;
      const next = accepted ? currentTyped + text : currentTyped;
      if (accepted) {
        typedRef.current = next;
      }

      commit(text);
      if (!accepted) {
        return;
      }

      const expected = currentPassage[currentTyped.length];
      playTypingSound(text === expected ? "hit" : "miss");

      const completed = finishOn === "exact" ? next === currentPassage : next.length === currentPassage.length;
      if (!finishedRef.current && currentPassage.length > 0 && completed) {
        finishedRef.current = true;
        playTypingSound("finish");
      }
    },
    [finishOn],
  );

  const backspace = useCallback((commit: () => void) => {
    const currentTyped = typedRef.current;
    const accepted = currentTyped.length > 0;
    if (accepted) {
      typedRef.current = currentTyped.slice(0, -1);
      finishedRef.current = false;
    }

    commit();
    if (accepted) {
      playTypingSound("backspace");
    }
  }, []);

  return { insert, backspace };
}
