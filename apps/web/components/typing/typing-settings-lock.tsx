"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type TypingSettingsLockValue = {
  locked: boolean;
  setLocked: (locked: boolean) => void;
};

const TypingSettingsLockContext = createContext<TypingSettingsLockValue | null>(null);

type TypingSettingsLockProviderProps = {
  children: ReactNode;
};

export function TypingSettingsLockProvider({ children }: TypingSettingsLockProviderProps) {
  const [locked, setLocked] = useState(false);
  const value = useMemo(() => ({ locked, setLocked }), [locked]);

  return (
    <TypingSettingsLockContext.Provider value={value}>{children}</TypingSettingsLockContext.Provider>
  );
}

export function useTypingSettingsLock(): TypingSettingsLockValue {
  const context = useContext(TypingSettingsLockContext);
  if (!context) {
    throw new Error("useTypingSettingsLock must be used within TypingSettingsLockProvider");
  }
  return context;
}
