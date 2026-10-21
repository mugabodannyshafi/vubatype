"use client";

import { Table } from "@heroui/react";

import type { LeaderboardEntry } from "@/lib/types/room";

import { EmptyState } from "@/components/feedback/empty-state";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  label?: string;
};

export function Leaderboard({ entries, label = "Leaderboard" }: LeaderboardProps) {
  if (entries.length === 0) {
    return <EmptyState description="Results will show up after a match." title="No results yet" />;
  }

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={label}>
          <Table.Header>
            <Table.Column isRowHeader>Rank</Table.Column>
            <Table.Column>Player</Table.Column>
            <Table.Column>WPM</Table.Column>
            <Table.Column>Accuracy</Table.Column>
          </Table.Header>
          <Table.Body>
            {entries.map((entry) => (
              <Table.Row key={entry.id} id={entry.id}>
                <Table.Cell>{entry.rank}</Table.Cell>
                <Table.Cell>{entry.name}</Table.Cell>
                <Table.Cell>{Math.round(entry.wpm)}</Table.Cell>
                <Table.Cell>{entry.accuracy.toFixed(1)}%</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
