"use client";

import { useSyncExternalStore } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import { racePacePoints, type RacePacePoint } from "@/lib/race/pace";
import type { RacePaceSample } from "@/lib/race/types";

type RacePaceChartProps = {
  samples: RacePaceSample[];
};

const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 };

function subscribeToClient() {
  return () => {};
}

function isClient() {
  return true;
}

function isServer() {
  return false;
}

function useIsClient(): boolean {
  return useSyncExternalStore(subscribeToClient, isClient, isServer);
}

function isPacePoint(value: unknown): value is RacePacePoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "second" in value && "wpm" in value;
}

function PaceTooltip({ active, payload }: TooltipContentProps) {
  const point = payload[0]?.payload;
  if (!active || !isPacePoint(point)) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs leading-5 text-foreground">
      <p className="font-mono tabular-nums">{point.second}s</p>
      <p className="font-mono tabular-nums">WPM {Math.round(point.wpm)}</p>
    </div>
  );
}

function tickInterval(pointCount: number): number {
  if (pointCount <= 8) {
    return 0;
  }

  return Math.ceil(pointCount / 6) - 1;
}

export function RacePaceChart({ samples }: RacePaceChartProps) {
  const mounted = useIsClient();
  const points = racePacePoints(samples);

  if (points.length === 0) {
    return null;
  }

  return (
    <figure className="flex w-full min-w-0 flex-col gap-3">
      <div className="h-44 w-full" aria-label="Words per minute during the race" role="img">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                axisLine={{ stroke: "var(--border)" }}
                dataKey="second"
                interval={tickInterval(points.length)}
                minTickGap={24}
                tick={AXIS_TICK}
                tickFormatter={(value: number) => `${value}s`}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={[
                  (dataMin: number) => Math.min(0, Math.floor(dataMin)),
                  (dataMax: number) => Math.max(10, Math.ceil(dataMax)),
                ]}
                tick={AXIS_TICK}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={PaceTooltip}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="wpm"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: "var(--accent)" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-accent" />
          WPM
        </span>
        <span>Pace recorded during the race.</span>
      </figcaption>
    </figure>
  );
}
