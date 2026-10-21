"use client";

import { Avatar } from "@heroui/react";

type PlayerAvatarProps = {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md";
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlayerAvatar({ name, avatarUrl, size = "sm" }: PlayerAvatarProps) {
  const initials = initialsFor(name);

  return (
    <Avatar aria-label={`${name} avatar`} size={size}>
      {avatarUrl ? <Avatar.Image alt="" src={avatarUrl} /> : null}
      <Avatar.Fallback>{initials}</Avatar.Fallback>
    </Avatar>
  );
}
