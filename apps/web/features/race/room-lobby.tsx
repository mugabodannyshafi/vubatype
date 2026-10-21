"use client";

import { Chip } from "@heroui/react";
import { useState } from "react";

import { PlayerAvatar } from "@/components/player/player-avatar";
import { AppButton } from "@/components/ui/app-button";
import type { RoomView } from "@/lib/api/rooms";
import type { RoomYou } from "@/lib/race/types";

type RoomLobbyProps = {
  canStart: boolean;
  onLeave: () => void;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  room: RoomView;
  you: RoomYou | null;
};

function difficultyLabel(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function RoomLobby({ canStart, onLeave, onReady, onStart, room, you }: RoomLobbyProps) {
  const [copied, setCopied] = useState(false);
  const invitePath = `/rooms/${room.code}`;

  async function copyLink() {
    const link = `${window.location.origin}${invitePath}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Private room</p>
          <p className="font-mono text-4xl tracking-[0.18em] text-foreground sm:text-5xl">{room.code}</p>
        </div>
        <AppButton variant="secondary" onPress={() => void copyLink()}>
          {copied ? "Link copied" : "Copy invite link"}
        </AppButton>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip size="sm" variant="soft">
          <Chip.Label>{room.settings.language.name}</Chip.Label>
        </Chip>
        <Chip size="sm" variant="soft">
          <Chip.Label>{difficultyLabel(room.settings.difficulty)}</Chip.Label>
        </Chip>
        <Chip size="sm" variant="soft">
          <Chip.Label>{room.settings.duration_seconds}s limit</Chip.Label>
        </Chip>
        <Chip size="sm" variant="soft">
          <Chip.Label>
            {room.players.length}/{room.settings.max_players} players
          </Chip.Label>
        </Chip>
      </div>
      <ul className="flex flex-col gap-3">
        {room.players.map((player) => {
          const status = player.connected === false ? "Offline" : player.is_ready ? "Ready" : "Not ready";
          return (
            <li
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar avatarUrl={player.guest.avatar_url ?? undefined} name={player.guest.nickname} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{player.guest.nickname}</p>
                  <p className="text-xs text-muted">{status}</p>
                </div>
              </div>
              {player.is_host ? (
                <Chip color="accent" size="sm" variant="soft">
                  <Chip.Label>Host</Chip.Label>
                </Chip>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {you ? (
          <AppButton variant={you.is_ready ? "secondary" : "primary"} onPress={() => onReady(!you.is_ready)}>
            {you.is_ready ? "Not ready" : "Ready"}
          </AppButton>
        ) : null}
        {you?.is_host ? (
          <AppButton isDisabled={!canStart} onPress={onStart}>
            Start race
          </AppButton>
        ) : null}
        <AppButton variant="ghost" onPress={onLeave}>
          Leave
        </AppButton>
      </div>
      {you?.is_host && !canStart ? (
        <p className="text-sm text-muted">Start unlocks when at least two players are here and everyone connected is ready.</p>
      ) : null}
    </div>
  );
}
