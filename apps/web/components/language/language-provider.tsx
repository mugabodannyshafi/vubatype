"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  LANGUAGE_STORAGE_KEY,
  type LanguageCode,
} from "@/lib/constants/languages";

const LANGUAGE_EVENT = "vubatype-language-change";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LANGUAGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readLanguage(): LanguageCode {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored && isLanguageCode(stored) ? stored : DEFAULT_LANGUAGE;
}

function getServerLanguage(): LanguageCode {
  return DEFAULT_LANGUAGE;
}

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const language = useSyncExternalStore(subscribe, readLanguage, getServerLanguage);

  const setLanguage = useCallback((code: LanguageCode) => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
  );
}

export function useTypingLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTypingLanguage must be used within LanguageProvider");
  }
  return context;
}
