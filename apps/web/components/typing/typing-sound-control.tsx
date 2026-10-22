"use client";

import { Button, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";

import { installSoundGestureListener, playTypingSound } from "@/lib/sound/engine";
import { useSoundPreferences, type SoundMode } from "@/lib/sound/preferences";

const MODES = [
  { value: "mechanical", label: "Mechanical" },
  { value: "soft", label: "Soft" },
  { value: "off", label: "Off" },
] as const satisfies ReadonlyArray<{ value: SoundMode; label: string }>;

function isSoundMode(value: string): value is SoundMode {
  return MODES.some((mode) => mode.value === value);
}

function readSelection(keys: Iterable<unknown>): string | null {
  const key = [...keys][0];
  return typeof key === "string" ? key : null;
}

function volumeFromPointer(event: PointerEvent<HTMLInputElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 9.5h3.2L12 6.2v11.6l-4.3-3.3H4.5v-5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path d="M15.2 9.2a3.4 3.4 0 0 1 0 5.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
      <path d="M17.4 7a6.2 6.2 0 0 1 0 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 9.5h3.2L12 6.2v11.6l-4.3-3.3H4.5v-5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

export function TypingSoundControl() {
  const { mode, volume, setMode, setVolume } = useSoundPreferences();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const volumeId = useId();
  const modeLabel = MODES.find((item) => item.value === mode)?.label ?? "Off";

  useEffect(() => {
    installSoundGestureListener();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: globalThis.PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectMode(next: SoundMode) {
    if (next === mode) {
      return;
    }
    setMode(next);
    if (next !== "off") {
      playTypingSound("hit");
    }
  }

  function onVolumePointerDown(event: PointerEvent<HTMLInputElement>) {
    if (mode === "off") {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setVolume(volumeFromPointer(event));
  }

  function onVolumePointerMove(event: PointerEvent<HTMLInputElement>) {
    if (mode === "off" || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    setVolume(volumeFromPointer(event));
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerDown={(event) => {
        event.preventDefault();
      }}
    >
      <Button
        isIconOnly
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Typing sounds, ${modeLabel}`}
        className="size-9"
        variant="ghost"
        onPress={() => setOpen((current) => !current)}
      >
        {mode === "off" ? <MutedIcon /> : <SpeakerIcon />}
      </Button>
      {open ? (
        <div
          aria-label="Typing sound settings"
          className="absolute top-full right-0 z-30 mt-2 w-72 rounded-lg border border-border bg-surface p-3 text-foreground shadow-lg"
          id={panelId}
          role="dialog"
        >
          <div className="flex flex-col gap-3">
            <ToggleButtonGroup
              aria-label="Sound mode"
              disallowEmptySelection
              selectedKeys={[mode]}
              selectionMode="single"
              size="sm"
              onSelectionChange={(keys) => {
                const key = readSelection(keys);
                if (key && isSoundMode(key)) {
                  selectMode(key);
                }
              }}
            >
              {MODES.map((item) => (
                <ToggleButton key={item.value} id={item.value}>
                  {item.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium tracking-wide text-muted uppercase" htmlFor={volumeId}>
                Volume
              </label>
              <input
                aria-valuetext={`${Math.round(volume * 100)} percent`}
                className="h-1 w-full cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={mode === "off"}
                id={volumeId}
                max={100}
                min={0}
                step={1}
                type="range"
                value={Math.round(volume * 100)}
                onChange={(event) => setVolume(Number(event.currentTarget.value) / 100)}
                onPointerDown={onVolumePointerDown}
                onPointerMove={onVolumePointerMove}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
