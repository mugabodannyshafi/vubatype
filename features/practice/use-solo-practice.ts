"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/http";
import { ensureGuestSession } from "@/lib/api/guests";
import {
  finishPracticeSession,
  startPracticeSession,
  type PracticeResult,
  type PracticeSession,
  type StartPracticeInput,
} from "@/lib/api/practice";
import { resolveSessionClock } from "@/lib/typing/time";

export type PracticePhase = "idle" | "starting" | "typing" | "finishing" | "finished" | "error";

export type PracticeError = {
  title: string;
  description?: string;
};

type SoloPracticeState = {
  phase: PracticePhase;
  passage: string;
  typedText: string;
  startedAt: number | null;
  expiresAt: number | null;
  durationSeconds: number;
  now: number;
  result: PracticeResult | null;
  error: PracticeError | null;
};

const INITIAL_STATE: SoloPracticeState = {
  phase: "idle",
  passage: "",
  typedText: "",
  startedAt: null,
  expiresAt: null,
  durationSeconds: 30,
  now: 0,
  result: null,
  error: null,
};

function practiceError(error: unknown, action: "start" | "finish"): PracticeError {
  if (!(error instanceof ApiError)) {
    return {
      title: "Could not reach the server",
      description: "Check that the API is running and try again.",
    };
  }

  if (error.status === 401) {
    return {
      title: "Guest session expired",
      description: "Start again to open a new guest session.",
    };
  }

  if (error.status === 409 || /expired/i.test(error.message)) {
    return {
      title: "This test has expired",
      description: "Start again to get a new passage.",
    };
  }

  if (/already finished/i.test(error.message)) {
    return {
      title: "This test is already finished",
      description: "Start again to get a new passage.",
    };
  }

  if (/no approved words/i.test(error.message)) {
    return {
      title: "No words available",
      description: "Try another language or difficulty.",
    };
  }

  return {
    title: action === "start" ? "Could not start the test" : "Could not save the result",
    description: error.message,
  };
}

async function openPracticeSession(input: StartPracticeInput): Promise<PracticeSession> {
  await ensureGuestSession();
  try {
    return await startPracticeSession(input);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await ensureGuestSession();
      return startPracticeSession(input);
    }
    throw error;
  }
}

export function useSoloPractice() {
  const [state, setState] = useState<SoloPracticeState>(INITIAL_STATE);
  const phaseRef = useRef<PracticePhase>(INITIAL_STATE.phase);
  const passageRef = useRef("");
  const typedRef = useRef("");
  const sessionIdRef = useRef<number | null>(null);
  const startLock = useRef(false);
  const finishLock = useRef(false);

  const finish = useCallback(async () => {
    if (finishLock.current || phaseRef.current !== "typing" || sessionIdRef.current === null) {
      return;
    }

    finishLock.current = true;
    phaseRef.current = "finishing";
    setState((current) => ({ ...current, phase: "finishing", error: null }));

    try {
      const result = await finishPracticeSession(sessionIdRef.current, typedRef.current);
      phaseRef.current = "finished";
      setState((current) => ({
        ...current,
        phase: "finished",
        result,
        error: null,
      }));
    } catch (error) {
      phaseRef.current = "error";
      setState((current) => ({
        ...current,
        phase: "error",
        error: practiceError(error, "finish"),
      }));
    }
  }, []);

  const insertText = useCallback(
    (text: string) => {
      if (phaseRef.current !== "typing" || text.length !== 1) {
        return;
      }

      const passage = passageRef.current;
      if (typedRef.current.length >= passage.length) {
        return;
      }

      const next = typedRef.current + text;
      typedRef.current = next;
      setState((current) => ({ ...current, typedText: next }));

      if (next.length === passage.length) {
        void finish();
      }
    },
    [finish],
  );

  const backspace = useCallback(() => {
    if (phaseRef.current !== "typing" || typedRef.current.length === 0) {
      return;
    }

    const next = typedRef.current.slice(0, -1);
    typedRef.current = next;
    setState((current) => ({ ...current, typedText: next }));
  }, []);

  const start = useCallback(
    async (input: StartPracticeInput) => {
      if (
        startLock.current ||
        phaseRef.current === "starting" ||
        phaseRef.current === "typing" ||
        phaseRef.current === "finishing"
      ) {
        return;
      }

      startLock.current = true;
      finishLock.current = false;
      sessionIdRef.current = null;
      passageRef.current = "";
      typedRef.current = "";
      phaseRef.current = "starting";
      setState({
        ...INITIAL_STATE,
        phase: "starting",
        durationSeconds: input.duration_seconds,
        now: Date.now(),
      });

      try {
        const session = await openPracticeSession(input);
        if (!session.passage.content) {
          throw new ApiError(400, "No approved words are available for this language and difficulty");
        }

        const receivedAt = Date.now();
        const clock = resolveSessionClock(
          session.started_at,
          session.expires_at,
          session.duration_seconds,
          receivedAt,
        );

        sessionIdRef.current = session.id;
        passageRef.current = session.passage.content;
        typedRef.current = "";
        phaseRef.current = "typing";
        setState({
          phase: "typing",
          passage: session.passage.content,
          typedText: "",
          startedAt: clock.startedAt,
          expiresAt: clock.expiresAt,
          durationSeconds: session.duration_seconds,
          now: receivedAt,
          result: null,
          error: null,
        });
      } catch (error) {
        sessionIdRef.current = null;
        passageRef.current = "";
        phaseRef.current = "error";
        setState({
          ...INITIAL_STATE,
          phase: "error",
          durationSeconds: input.duration_seconds,
          error: practiceError(error, "start"),
        });
      } finally {
        startLock.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (state.phase !== "typing" || state.expiresAt === null) {
      return;
    }

    const tick = window.setInterval(() => {
      setState((current) => (current.phase === "typing" ? { ...current, now: Date.now() } : current));
    }, 200);
    const delay = Math.max(0, state.expiresAt - Date.now());
    const timeout = window.setTimeout(() => {
      setState((current) => (current.phase === "typing" ? { ...current, now: Date.now() } : current));
      void finish();
    }, delay);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timeout);
    };
  }, [finish, state.expiresAt, state.phase]);

  return {
    ...state,
    start,
    insertText,
    backspace,
  };
}
