"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/http";
import { ensureGuestSession } from "@/lib/api/guests";
import {
  beginPracticeSession,
  finishPracticeSession,
  startPracticeSession,
  type PracticeResult,
  type PracticeSession,
  type StartPracticeInput,
} from "@/lib/api/practice";
import { paceSample, type PaceSample } from "@/lib/typing/pace";
import { resolveSessionClock } from "@/lib/typing/time";

export type PracticePhase = "idle" | "starting" | "ready" | "typing" | "finishing" | "finished" | "error";

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
  result: PracticeResult | null;
  samples: PaceSample[];
  error: PracticeError | null;
};

const INITIAL_STATE: SoloPracticeState = {
  phase: "idle",
  passage: "",
  typedText: "",
  startedAt: null,
  expiresAt: null,
  durationSeconds: 30,
  result: null,
  samples: [],
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

async function armPracticeSession(id: number): Promise<PracticeSession> {
  try {
    return await beginPracticeSession(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await ensureGuestSession();
      return beginPracticeSession(id);
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
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef(INITIAL_STATE.durationSeconds);
  const samplesRef = useRef<PaceSample[]>([]);
  const runRef = useRef(0);
  const finishLock = useRef(false);
  const beginLock = useRef<Promise<void> | null>(null);
  const clockErrorRef = useRef<unknown>(null);

  const captureSamples = useCallback((): PaceSample[] => {
    const startedAt = startedAtRef.current;
    if (startedAt !== null) {
      const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), durationRef.current * 1000);
      const last = samplesRef.current[samplesRef.current.length - 1];
      const sample = paceSample(passageRef.current, typedRef.current, elapsed);
      if (!last) {
        samplesRef.current.push(sample);
      } else if (elapsed - last.elapsedMs < 300) {
        samplesRef.current[samplesRef.current.length - 1] = sample;
      } else {
        samplesRef.current.push(sample);
      }
    }

    return samplesRef.current.map((sample) => ({ ...sample }));
  }, []);

  const finish = useCallback(async () => {
    if (finishLock.current || phaseRef.current !== "typing" || sessionIdRef.current === null) {
      return;
    }

    const runId = runRef.current;
    finishLock.current = true;
    phaseRef.current = "finishing";
    const samples = captureSamples();
    setState((current) => ({ ...current, phase: "finishing", error: null }));

    try {
      if (beginLock.current) {
        await beginLock.current;
      }
      if (runRef.current !== runId) {
        return;
      }
      if (clockErrorRef.current) {
        phaseRef.current = "error";
        setState((current) => ({
          ...current,
          phase: "error",
          error: practiceError(clockErrorRef.current, "start"),
        }));
        return;
      }
      if (sessionIdRef.current === null) {
        return;
      }

      const result = await finishPracticeSession(sessionIdRef.current, typedRef.current);
      if (runRef.current !== runId) {
        return;
      }

      phaseRef.current = "finished";
      setState((current) => ({
        ...current,
        phase: "finished",
        result,
        samples,
        error: null,
      }));
    } catch (error) {
      if (runRef.current !== runId) {
        return;
      }

      phaseRef.current = "error";
      setState((current) => ({
        ...current,
        phase: "error",
        error: practiceError(error, "finish"),
      }));
    }
  }, [captureSamples]);

  const typeCharacter = useCallback(
    (text: string) => {
      if (text.length !== 1) {
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

  const insertText = useCallback(
    (text: string) => {
      if (phaseRef.current !== "typing") {
        return;
      }

      typeCharacter(text);
    },
    [typeCharacter],
  );

  const armClock = useCallback((sessionId: number, runId: number) => {
    const pending = armPracticeSession(sessionId)
      .then((session) => {
        if (runRef.current !== runId) {
          return;
        }

        const clock = resolveSessionClock(
          session.started_at,
          session.expires_at,
          session.duration_seconds,
          Date.now(),
        );
        if (phaseRef.current === "typing" || phaseRef.current === "finishing") {
          setState((current) => ({ ...current, expiresAt: clock.expiresAt }));
        }
      })
      .catch((error: unknown) => {
        if (runRef.current !== runId) {
          return;
        }

        clockErrorRef.current = error;
        if (phaseRef.current === "typing") {
          phaseRef.current = "error";
          setState((current) => ({
            ...current,
            phase: "error",
            error: practiceError(error, "start"),
          }));
        }
      });

    beginLock.current = pending;
  }, []);

  const startTyping = useCallback(
    (text: string) => {
      if (text.length !== 1) {
        return;
      }

      if (phaseRef.current === "typing") {
        typeCharacter(text);
        return;
      }

      if (phaseRef.current !== "ready" || sessionIdRef.current === null) {
        return;
      }

      const startedAt = Date.now();
      const sessionId = sessionIdRef.current;
      const runId = runRef.current;
      clockErrorRef.current = null;
      phaseRef.current = "typing";
      startedAtRef.current = startedAt;
      setState((current) => ({
        ...current,
        phase: "typing",
        startedAt,
        expiresAt: startedAt + durationRef.current * 1000,
        error: null,
      }));
      armClock(sessionId, runId);
      typeCharacter(text);
    },
    [armClock, typeCharacter],
  );

  const backspace = useCallback(() => {
    if (phaseRef.current !== "typing" || typedRef.current.length === 0) {
      return;
    }

    const next = typedRef.current.slice(0, -1);
    typedRef.current = next;
    setState((current) => ({ ...current, typedText: next }));
  }, []);

  const abandon = useCallback(() => {
    runRef.current += 1;
    finishLock.current = false;
    sessionIdRef.current = null;
    passageRef.current = "";
    typedRef.current = "";
    startedAtRef.current = null;
    samplesRef.current = [];
    beginLock.current = null;
    clockErrorRef.current = null;
    phaseRef.current = "idle";
    setState(INITIAL_STATE);
  }, []);

  const prepare = useCallback(async (input: StartPracticeInput, force = false) => {
    const phase = phaseRef.current;
    if (!force && (phase === "typing" || phase === "finishing" || phase === "finished")) {
      return;
    }
    if (phase === "finishing") {
      return;
    }

    const runId = runRef.current + 1;
    runRef.current = runId;
    finishLock.current = false;
    beginLock.current = null;
    clockErrorRef.current = null;
    sessionIdRef.current = null;
    passageRef.current = "";
    typedRef.current = "";
    startedAtRef.current = null;
    samplesRef.current = [];
    durationRef.current = input.duration_seconds;
    phaseRef.current = "starting";
    setState({
      ...INITIAL_STATE,
      phase: "starting",
      durationSeconds: input.duration_seconds,
    });

    try {
      const session = await openPracticeSession(input);
      if (runRef.current !== runId) {
        return;
      }

      if (!session.passage.content) {
        throw new ApiError(400, "No approved words are available for this language and difficulty");
      }

      sessionIdRef.current = session.id;
      passageRef.current = session.passage.content;
      typedRef.current = "";
      startedAtRef.current = null;
      durationRef.current = session.duration_seconds;
      samplesRef.current = [];
      phaseRef.current = "ready";
      setState({
        phase: "ready",
        passage: session.passage.content,
        typedText: "",
        startedAt: null,
        expiresAt: null,
        durationSeconds: session.duration_seconds,
        result: null,
        samples: [],
        error: null,
      });
    } catch (error) {
      if (runRef.current !== runId) {
        return;
      }

      sessionIdRef.current = null;
      passageRef.current = "";
      phaseRef.current = "error";
      setState({
        ...INITIAL_STATE,
        phase: "error",
        durationSeconds: input.duration_seconds,
        error: practiceError(error, "start"),
      });
    }
  }, []);

  const restart = useCallback(
    (input: StartPracticeInput) => {
      void prepare(input, true);
    },
    [prepare],
  );

  useEffect(() => {
    if (state.phase !== "typing" || state.expiresAt === null) {
      return;
    }

    const delay = Math.max(0, state.expiresAt - Date.now());
    const timeout = window.setTimeout(() => {
      void finish();
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [finish, state.expiresAt, state.phase]);

  useEffect(() => {
    if (state.phase !== "typing" || state.startedAt === null) {
      return;
    }

    const startedAt = state.startedAt;
    samplesRef.current = [
      { elapsedMs: 0, correctChars: 0, typedChars: 0, incorrectChars: 0 },
    ];
    let lastSecond = 0;
    const timer = window.setInterval(() => {
      const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), durationRef.current * 1000);
      const second = Math.floor(elapsed / 1000);
      if (second <= lastSecond) {
        return;
      }

      lastSecond = second;
      samplesRef.current.push(paceSample(passageRef.current, typedRef.current, elapsed));
    }, 200);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.phase, state.startedAt]);

  return {
    ...state,
    prepare,
    restart,
    startTyping,
    insertText,
    backspace,
    abandon,
  };
}
