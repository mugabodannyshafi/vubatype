"use client";

import { useSyncExternalStore } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

import type { ProgressPoint } from "@/lib/api/users";

type ProgressChartProps = {
  points: ProgressPoint[];
};

type ChartPoint = {
  label: string;
  netWpm: number;
  accuracy: number;
  when: string;
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

function chartPoints(points: ProgressPoint[]): ChartPoint[] {
  return points.map((point, index) => ({
    label: String(index + 1),
    netWpm: point.net_wpm,
    accuracy: point.accuracy,
    when: point.created_at ?? "",
  }));
}

function isChartPoint(value: unknown): value is ChartPoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "netWpm" in value && "accuracy" in value && "when" in value;
}

function ProgressTooltip({ active, payload }: TooltipContentProps) {
  const point = payload[0]?.payload;
  if (!active || !isChartPoint(point)) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs leading-5 text-foreground">
      {point.when ? <p className="text-muted">{point.when}</p> : null}
      <p className="font-mono tabular-nums">WPM {Math.round(point.netWpm)}</p>
      <p className="font-mono text-muted tabular-nums">Accuracy {point.accuracy.toFixed(1)}%</p>
    </div>
  );
}

export function ProgressChart({ points }: ProgressChartProps) {
  const mounted = useIsClient();
  const data = chartPoints(points);

  if (data.length < 2) {
    return <p className="text-sm text-muted">Finish a couple of tests to see your trend.</p>;
  }

  return (
    <figure className="flex w-full min-w-0 flex-col gap-3">
      <div className="h-48 w-full" aria-label="WPM and accuracy over recent practice sessions" role="img">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                axisLine={{ stroke: "var(--border)" }}
                dataKey="label"
                minTickGap={24}
                tick={AXIS_TICK}
                tickLine={false}
              />
              <YAxis hide yAxisId="wpm" domain={[0, "auto"]} />
              <YAxis hide yAxisId="accuracy" domain={[0, 100]} orientation="right" />
              <Tooltip
                content={ProgressTooltip}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="accuracy"
                type="monotone"
                dataKey="accuracy"
                stroke="var(--muted)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "var(--muted)" }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="wpm"
                type="monotone"
                dataKey="netWpm"
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
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-px w-4 bg-muted" />
          Accuracy
        </span>
      </figcaption>
    </figure>
  );
}
