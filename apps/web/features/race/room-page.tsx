"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppButton } from "@/components/ui/app-button";

import { RaceResults } from "./race-results";
import { RaceStage } from "./race-stage";
import { RoomLobby } from "./room-lobby";
import { useRaceRoom } from "./use-race-room";

type RoomPageProps = {
  code: string;
};

export function RoomPage({ code }: RoomPageProps) {
  const race = useRaceRoom(code);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:pt-10">
      {race.error && race.screen !== "error" ? (
        <p className="text-sm text-danger" role="alert">
          {race.error}
        </p>
      ) : null}
      {race.screen === "connecting" ? <LoadingState label="Joining the room" /> : null}
      {race.screen === "error" ? (
        <ErrorState description={race.error ?? undefined} title="Could not join this room" />
      ) : null}
      {race.screen === "closed" ? (
        <div className="flex flex-col gap-4">
          <ErrorState description="This room is no longer open." title="Room closed" />
          <AppButton className="w-fit" isPending={race.pending === "leave"} onPress={race.leave}>
            Back home
          </AppButton>
        </div>
      ) : null}
      {race.screen === "lobby" && race.room ? (
        <RoomLobby
          canStart={race.canStart}
          pending={race.pending}
          room={race.room}
          you={race.you}
          onLeave={race.leave}
          onReady={race.setReady}
          onStart={race.startRace}
        />
      ) : null}
      {race.screen === "countdown" || race.screen === "racing" ? (
        <RaceStage
          deadlineAt={race.deadlineAt}
          passage={race.passage}
          racers={race.racers}
          screen={race.screen}
          serverOffset={race.serverOffset}
          startsAt={race.startsAt}
          typedText={race.typedText}
          onBackspace={race.backspace}
          onType={race.typeCharacter}
        />
      ) : null}
      {race.screen === "results" ? (
        <RaceResults
          passage={race.passage}
          pending={race.pending}
          racers={race.racers}
          typedText={race.typedText}
          you={race.you}
          onLeave={race.leave}
          onRematch={race.rematch}
        />
      ) : null}
    </div>
  );
}
