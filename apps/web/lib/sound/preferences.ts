"use client";

import { useCallback, useSyncExternalStore } from "react";

export type SoundMode = "mechanical" | "soft" | "off";

export type SoundPreferences = {
  mode: SoundMode;
  volume: number;
};

export const SOUND_STORAGE_KEY = "vubatype-sound";

const SOUND_EVENT = "vubatype-sound-change";

const DEFAULT_PREFERENCES: SoundPreferences = {
  mode: "off",
  volume: 0.7,
};

let snapshot: SoundPreferences = DEFAULT_PREFERENCES;
let snapshotRaw: string | null | undefined;

function isSoundMode(value: unknown): value is SoundMode {
  return value === "mechanical" || value === "soft" || value === "off";
}

function clampVolume(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PREFERENCES.volume;
  }
  return Math.min(1, Math.max(0, value));
}

export function parseSoundPreferences(raw: string | null): SoundPreferences {
  if (!raw) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") {
      return { ...DEFAULT_PREFERENCES };
    }

    const record = value as { mode?: unknown; volume?: unknown };
    return {
      mode: isSoundMode(record.mode) ? record.mode : DEFAULT_PREFERENCES.mode,
      volume: clampVolume(record.volume),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function readSoundPreferences(): SoundPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
  if (raw === snapshotRaw) {
    return snapshot;
  }

  snapshotRaw = raw;
  snapshot = parseSoundPreferences(raw);
  return snapshot;
}

export function getServerSoundPreferences(): SoundPreferences {
  return DEFAULT_PREFERENCES;
}

export function writeSoundPreferences(preferences: SoundPreferences): void {
  const next: SoundPreferences = {
    mode: isSoundMode(preferences.mode) ? preferences.mode : DEFAULT_PREFERENCES.mode,
    volume: clampVolume(preferences.volume),
  };
  const raw = JSON.stringify(next);
  snapshot = next;
  snapshotRaw = raw;
  window.localStorage.setItem(SOUND_STORAGE_KEY, raw);
  window.dispatchEvent(new Event(SOUND_EVENT));
}

export function subscribeSoundPreferences(onStoreChange: () => void): () => void {
  window.addEventListener(SOUND_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SOUND_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useSoundPreferences() {
  const preferences = useSyncExternalStore(
    subscribeSoundPreferences,
    readSoundPreferences,
    getServerSoundPreferences,
  );

  const setMode = useCallback((mode: SoundMode) => {
    writeSoundPreferences({ ...readSoundPreferences(), mode });
  }, []);

  const setVolume = useCallback((volume: number) => {
    writeSoundPreferences({ ...readSoundPreferences(), volume });
  }, []);

  return { ...preferences, setMode, setVolume };
}
