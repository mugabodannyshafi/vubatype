"use client";

import { Card, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";

import { AppButton } from "@/components/ui/app-button";

export function GameActions() {
  const router = useRouter();

  return (
    <section aria-label="Game options" className="grid gap-3 md:grid-cols-3">
      <Card className="h-full border border-accent">
        <Card.Header>
          <Card.Title className="text-base">Race With Friends</Card.Title>
          <Card.Description>Create a private room and invite friends.</Card.Description>
        </Card.Header>
        <Card.Content className="flex-1" />
        <Card.Footer>
          <p className="text-sm text-muted">Private rooms are next.</p>
        </Card.Footer>
      </Card>
      <Card className="h-full">
        <Card.Header>
          <div className="flex items-center justify-between gap-2">
            <Card.Title>Enter a Race</Card.Title>
            <Chip color="accent" size="sm" variant="soft">
              <Chip.Label>Coming soon</Chip.Label>
            </Chip>
          </div>
          <Card.Description>Join a multiplayer race.</Card.Description>
        </Card.Header>
        <Card.Content className="flex-1" />
        <Card.Footer>
          <p className="text-sm text-muted">Public matchmaking is not open yet.</p>
        </Card.Footer>
      </Card>
      <Card className="h-full">
        <Card.Header>
          <Card.Title>Practice Typing</Card.Title>
          <Card.Description>Improve your typing speed on your own.</Card.Description>
        </Card.Header>
        <Card.Content className="flex-1" />
        <Card.Footer>
          <AppButton onPress={() => router.push("/practice")}>Start practice</AppButton>
        </Card.Footer>
      </Card>
    </section>
  );
}
