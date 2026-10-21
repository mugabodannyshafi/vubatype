"use client";

import type { PlayerStatus } from "@/lib/types/player";

import { PlayerAvatar } from "./player-avatar";

const STATUS_LABEL: Record<PlayerStatus, string> = {
  ready: "Ready",
  typing: "Typing",
  finished: "Finished",
};

const STATUS_CLASS: Record<PlayerStatus, string> = {
  ready: "bg-warning",
  typing: "bg-accent",
  finished: "bg-muted",
};

type PlayerIndicatorProps = {
  name: string;
  status: PlayerStatus;
  avatarUrl?: string;
};

export function PlayerIndicator({ name, status, avatarUrl }: PlayerIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <PlayerAvatar avatarUrl={avatarUrl} name={name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${STATUS_CLASS[status]}`} />
          {STATUS_LABEL[status]}
        </p>
      </div>
    </div>
  );
}
