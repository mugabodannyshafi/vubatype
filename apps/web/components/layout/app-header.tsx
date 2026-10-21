import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

import { AccountMenu } from "@/components/auth/account-menu";
import { LanguageSelector } from "@/components/language/language-selector";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

import { AppNav } from "./app-nav";

function NavFallback() {
  return (
    <nav aria-label="Main" className="flex items-center gap-4">
      <Link className="text-sm text-muted" href="/practice">
        Practice
      </Link>
      <Link className="text-sm text-muted" href="/#how-it-works">
        How it works
      </Link>
    </nav>
  );
}

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link className="inline-flex h-9 shrink-0 items-center overflow-hidden" href="/">
          <Image
            alt="VubaRace"
            className="h-[5.3rem] w-auto max-w-none [.light_&]:hidden"
            height={887}
            priority
            src="/VubaRace-logo-white.png"
            width={1774}
          />
          <Image
            alt="VubaRace"
            className="hidden h-[5.3rem] w-auto max-w-none [.light_&]:block"
            height={887}
            priority
            src="/VubaRace-logo-black.png"
            width={1774}
          />
        </Link>
        <Suspense fallback={<NavFallback />}>
          <AppNav />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <AccountMenu />
          <LanguageSelector />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
