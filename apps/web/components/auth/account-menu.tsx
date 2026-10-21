"use client";

import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";

import { PlayerAvatar } from "@/components/player/player-avatar";
import { AppButton } from "@/components/ui/app-button";

import { useAuth } from "./auth-provider";

export function AccountMenu() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div aria-hidden className="h-9 w-24" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <AppButton size="sm" variant="ghost" onPress={() => router.push("/login")}>
          Login
        </AppButton>
        <AppButton size="sm" onPress={() => router.push("/signup")}>
          Sign up
        </AppButton>
      </div>
    );
  }

  const name = user.display_name || user.username;

  return (
    <Dropdown>
      <Dropdown.Trigger aria-label={`${name} account menu`} className="rounded-full">
        <PlayerAvatar avatarUrl={user.avatar_url ?? undefined} name={name} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label="Account"
          onAction={(key) => {
            if (key === "profile") {
              router.push("/profile");
            }
            if (key === "settings") {
              router.push("/settings");
            }
            if (key === "logout") {
              void logout().then(() => router.push("/"));
            }
          }}
        >
          <Dropdown.Item id="profile" textValue="Profile">
            Profile
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue="Settings">
            Settings
          </Dropdown.Item>
          <Dropdown.Item id="logout" textValue="Logout">
            Logout
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
