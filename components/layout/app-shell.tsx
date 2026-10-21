import type { ReactNode } from "react";

import { AppHeader } from "./app-header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
