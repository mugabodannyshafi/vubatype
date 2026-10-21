"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { LanguageProvider } from "@/components/language/language-provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="vubatype-theme"
    >
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
