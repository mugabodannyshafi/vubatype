"use client";

import { Card } from "@heroui/react";

import { getLanguageName } from "@/lib/constants/languages";
import type { RoomSummary } from "@/lib/types/room";

type RoomCardProps = {
  room: RoomSummary;
};

function formatPlayerCount(count: number, capacity: number): string {
  const noun = count === 1 ? "player" : "players";
  return `${count}/${capacity} ${noun}`;
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <Card className="w-full" variant="secondary">
      <Card.Header>
        <Card.Title>{room.name}</Card.Title>
        <Card.Description>{getLanguageName(room.languageCode)}</Card.Description>
      </Card.Header>
      <Card.Footer>
        <p className="text-sm text-muted">{formatPlayerCount(room.playerCount, room.capacity)}</p>
      </Card.Footer>
    </Card>
  );
}
