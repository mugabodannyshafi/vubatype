import { RaceLane, type RaceLaneRacer } from "@/components/race/race-lane";

export type LiveRacer = RaceLaneRacer & {
  avatarUrl: string | null;
  accuracy: number;
  finished: boolean;
};

export function LiveRaceTrack({ racers }: { racers: LiveRacer[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3">
        {racers.map((racer) => (
          <RaceLane key={racer.id} racer={racer} />
        ))}
      </div>
    </div>
  );
}
