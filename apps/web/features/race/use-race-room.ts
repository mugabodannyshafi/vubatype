"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { ApiError } from "@/lib/api/http";
import { ensureGuestSession } from "@/lib/api/guests";
import { issueRealtimeTicket, raceSocketOrigin, type RoomView } from "@/lib/api/rooms";
import type { RaceRacer, RaceSync, RoomYou } from "@/lib/race/types";

export type RoomScreen =
  | "connecting"
  | "lobby"
  | "countdown"
  | "racing"
  | "results"
  | "closed"
  | "error";

type RoomStateEvent = {
  room: RoomView;
  you: RoomYou | null;
  can_start: boolean;
  sync: RaceSync | null;
};

export type PendingAction = "ready" | "start" | "leave" | "rematch";

const ACTION_TIMEOUT_MS = 8_000;

type RaceRoom = {
  screen: RoomScreen;
  room: RoomView | null;
  you: RoomYou | null;
  canStart: boolean;
  passage: string;
  typedText: string;
  racers: RaceRacer[];
  startsAt: number | null;
  deadlineAt: number | null;
  serverOffset: number;
  error: string | null;
  pending: PendingAction | null;
  leave: () => void;
  setReady: (ready: boolean) => void;
  startRace: () => void;
  rematch: () => void;
  typeCharacter: (text: string) => void;
  backspace: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function useRaceRoom(code: string): RaceRoom {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const codeRef = useRef(code);
  const passageRef = useRef("");
  const typedRef = useRef("");
  const screenRef = useRef<RoomScreen>("connecting");
  const hydratedRef = useRef(false);
  const leftRef = useRef(false);
  const [screen, setScreen] = useState<RoomScreen>("connecting");
  const [room, setRoom] = useState<RoomView | null>(null);
  const [you, setYou] = useState<RoomYou | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [passage, setPassage] = useState("");
  const [typedText, setTypedText] = useState("");
  const [racers, setRacers] = useState<RaceRacer[]>([]);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const pendingRef = useRef<PendingAction | null>(null);

  const showScreen = useCallback((next: RoomScreen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const publish = useCallback((next: string) => {
    typedRef.current = next;
    setTypedText(next);
    socketRef.current?.emit("race:progress", {
      code: codeRef.current,
      typed_text: next,
    });
  }, []);

  const applySync = useCallback(
    (sync: RaceSync) => {
      passageRef.current = sync.passage;
      setPassage(sync.passage);
      setRacers(sync.racers);
      setStartsAt(sync.starts_at);
      setDeadlineAt(sync.deadline_at);
      setServerOffset(sync.server_now - Date.now());
      if (!hydratedRef.current) {
        typedRef.current = sync.typed_text;
        setTypedText(sync.typed_text);
        hydratedRef.current = true;
      }
      showScreen(sync.phase === "countdown" ? "countdown" : sync.phase === "running" ? "racing" : "results");
    },
    [showScreen],
  );

  const applyRoom = useCallback(
    (payload: RoomStateEvent) => {
      codeRef.current = payload.room.code;
      setRoom(payload.room);
      setYou(payload.you);
      setCanStart(payload.can_start);
      setError(null);
      if (payload.sync) {
        applySync(payload.sync);
        return;
      }

      if (payload.room.status === "waiting") {
        passageRef.current = "";
        typedRef.current = "";
        hydratedRef.current = false;
        setPassage("");
        setTypedText("");
        setRacers([]);
        setStartsAt(null);
        setDeadlineAt(null);
        showScreen("lobby");
        return;
      }

      if (payload.room.status === "expired") {
        showScreen("closed");
      }
    },
    [applySync, showScreen],
  );

  useEffect(() => {
    let active = true;
    leftRef.current = false;
    const socket = io(raceSocketOrigin(), {
      autoConnect: false,
      reconnection: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (!leftRef.current) {
        hydratedRef.current = false;
        socket.emit("room:join", { code });
      }
    });
    socket.on("connect_error", () => {
      if (active) {
        setError("Could not connect to the race server.");
        showScreen("error");
      }
    });
    socket.on("room:state", (payload: RoomStateEvent) => {
      if (active && isRecord(payload) && isRecord(payload.room)) {
        applyRoom(payload);
      }
    });
    socket.on("race:countdown", (payload: { passage?: string; starts_at?: number; server_now?: number }) => {
      if (!active) {
        return;
      }
      if (typeof payload.passage === "string") {
        passageRef.current = payload.passage;
        setPassage(payload.passage);
      }
      if (typeof payload.starts_at === "number") {
        setStartsAt(payload.starts_at);
      }
      if (typeof payload.server_now === "number") {
        setServerOffset(payload.server_now - Date.now());
      }
      typedRef.current = "";
      setTypedText("");
      hydratedRef.current = true;
      showScreen("countdown");
    });
    socket.on("race:started", (payload: { started_at?: number; deadline_at?: number; server_now?: number }) => {
      if (!active) {
        return;
      }
      if (typeof payload.started_at === "number") {
        setStartsAt(payload.started_at);
      }
      if (typeof payload.deadline_at === "number") {
        setDeadlineAt(payload.deadline_at);
      }
      if (typeof payload.server_now === "number") {
        setServerOffset(payload.server_now - Date.now());
      }
      showScreen("racing");
    });
    socket.on("race:standings", (payload: { racers?: RaceRacer[] }) => {
      if (active && Array.isArray(payload.racers)) {
        setRacers(payload.racers);
      }
    });
    socket.on("race:finished", (payload: { racers?: RaceRacer[] }) => {
      if (!active) {
        return;
      }
      if (Array.isArray(payload.racers)) {
        setRacers(payload.racers);
      }
      showScreen("results");
    });
    socket.on("room:error", (payload: { message?: string }) => {
      if (!active) {
        return;
      }
      setError(payload.message ?? "Something went wrong");
      if (screenRef.current === "connecting") {
        showScreen("error");
      }
    });
    socket.on("room:closed", () => {
      if (active) {
        showScreen("closed");
      }
    });

    void ensureGuestSession()
      .then(() => issueRealtimeTicket())
      .then((ticket) => {
        if (!active) {
          return;
        }
        socket.auth = { token: ticket.token };
        socket.connect();
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof ApiError ? caught.message : "Could not open a guest session.");
        showScreen("error");
      });

    return () => {
      active = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyRoom, code, showScreen]);

  const finishPending = useCallback((action: PendingAction) => {
    if (pendingRef.current !== action) {
      return;
    }
    pendingRef.current = null;
    setPending(null);
  }, []);

  const emitWaiting = useCallback(
    (action: PendingAction, event: string, payload: object) => {
      if (pendingRef.current) {
        return;
      }
      const socket = socketRef.current;
      if (!socket) {
        return;
      }
      pendingRef.current = action;
      setPending(action);
      socket.timeout(ACTION_TIMEOUT_MS).emit(event, payload, (ackError: unknown) => {
        if (ackError) {
          setError("The server took too long. Try again.");
        }
        finishPending(action);
      });
    },
    [finishPending],
  );

  const leave = useCallback(() => {
    if (pendingRef.current) {
      return;
    }
    leftRef.current = true;
    const socket = socketRef.current;
    if (!socket) {
      router.push("/");
      return;
    }
    pendingRef.current = "leave";
    setPending("leave");
    let finished = false;
    const goHome = () => {
      if (finished) {
        return;
      }
      finished = true;
      pendingRef.current = null;
      setPending(null);
      socket.disconnect();
      router.push("/");
    };
    socket.timeout(ACTION_TIMEOUT_MS).emit("room:leave", { code: codeRef.current }, goHome);
  }, [router]);

  const setReady = useCallback(
    (ready: boolean) => {
      emitWaiting("ready", "room:ready", { code: codeRef.current, ready });
    },
    [emitWaiting],
  );

  const startRace = useCallback(() => {
    emitWaiting("start", "race:start", { code: codeRef.current });
  }, [emitWaiting]);

  const rematch = useCallback(() => {
    if (pendingRef.current || !socketRef.current) {
      return;
    }
    hydratedRef.current = false;
    emitWaiting("rematch", "race:rematch", { code: codeRef.current });
  }, [emitWaiting]);

  const typeCharacter = useCallback(
    (text: string) => {
      if (screenRef.current !== "racing" || text.length !== 1) {
        return;
      }
      if (typedRef.current.length >= passageRef.current.length) {
        return;
      }
      publish(typedRef.current + text);
    },
    [publish],
  );

  const backspace = useCallback(() => {
    if (screenRef.current !== "racing" || typedRef.current.length === 0) {
      return;
    }
    publish(typedRef.current.slice(0, -1));
  }, [publish]);

  return {
    screen,
    room,
    you,
    canStart,
    passage,
    typedText,
    racers,
    startsAt,
    deadlineAt,
    serverOffset,
    error,
    pending,
    leave,
    setReady,
    startRace,
    rematch,
    typeCharacter,
    backspace,
  };
}
