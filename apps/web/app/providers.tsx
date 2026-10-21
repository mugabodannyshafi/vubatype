"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { LanguageProvider } from "@/components/language/language-provider";
import { TypingSettingsLockProvider } from "@/components/typing/typing-settings-lock";

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
      <LanguageProvider>
        <AuthProvider>
          <TypingSettingsLockProvider>{children}</TypingSettingsLockProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
