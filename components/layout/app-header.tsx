import Link from "next/link";

import { LanguageSelector } from "@/components/language/language-selector";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

import { AppNav } from "./app-nav";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          href="/"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          VubaType
        </Link>
        <AppNav />
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
