"use client";

import { useSyncExternalStore } from "react";
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import { hasPaceChart, paceChartPoints, type PaceChartPoint, type PaceSample } from "@/lib/typing/pace";

type PracticeChartProps = {
  samples: PaceSample[];
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

function isPacePoint(value: unknown): value is PaceChartPoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "second" in value && "wpm" in value && "rawWpm" in value && "errors" in value;
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
      <p className="font-mono text-muted tabular-nums">Raw {Math.round(point.rawWpm)}</p>
      <p className="font-mono tabular-nums">Errors {point.errors}</p>
    </div>
  );
}

function tickInterval(pointCount: number): number {
  if (pointCount <= 8) {
    return 0;
  }

  return Math.ceil(pointCount / 6) - 1;
}

export function PracticeChart({ samples }: PracticeChartProps) {
  const mounted = useIsClient();
  const points = paceChartPoints(samples);
  const hasErrors = points.some((point) => point.errors > 0);

  if (!hasPaceChart(samples) || points.length === 0) {
    return <p className="text-sm text-muted">Not enough typing data for a chart.</p>;
  }

  return (
    <figure className="flex w-full min-w-0 flex-col gap-3">
      <div className="h-40 w-full" aria-label="Typing pace recorded during the test" role="img">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                axisLine={{ stroke: "var(--border)" }}
                dataKey="second"
                interval={tickInterval(points.length)}
                minTickGap={24}
                tick={AXIS_TICK}
                tickFormatter={(value: number) => `${value}s`}
                tickLine={false}
              />
              <YAxis hide yAxisId="wpm" domain={[0, "auto"]} />
              {hasErrors ? <YAxis hide yAxisId="errors" domain={[0, "auto"]} orientation="right" /> : null}
              <Tooltip
                content={PaceTooltip}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {hasErrors ? (
                <Bar
                  yAxisId="errors"
                  dataKey="errors"
                  fill="var(--danger)"
                  isAnimationActive={false}
                  maxBarSize={6}
                />
              ) : null}
              <Line
                yAxisId="wpm"
                type="linear"
                dataKey="rawWpm"
                stroke="var(--muted)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "var(--muted)" }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="wpm"
                type="linear"
                dataKey="wpm"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: "var(--accent)" }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-accent" />
          WPM
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-px w-4 bg-muted" />
          Raw
        </span>
        {hasErrors ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2 bg-danger" />
            Errors
          </span>
        ) : null}
        <span>Pace recorded on this device during the test.</span>
      </figcaption>
    </figure>
  );
}
