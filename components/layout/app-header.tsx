import Link from "next/link";

import { LanguageSelector } from "@/components/language/language-selector";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          href="/"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          VubaType
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
