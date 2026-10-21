"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useTypingLanguage } from "@/components/language/language-provider";
import { ApiError } from "@/lib/api/http";
import { loginAccount, logoutAccount, registerAccount, type RegisterInput } from "@/lib/api/auth";
import { getCurrentUser, type AuthUser } from "@/lib/api/users";
import { isLanguageCode } from "@/lib/constants/languages";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { setLanguage } = useTypingLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const appliedLanguage = useRef(false);

  const applyPreferredLanguage = useCallback(
    (next: AuthUser | null) => {
      const code = next?.preferred_language?.code;
      if (!appliedLanguage.current && code && isLanguageCode(code)) {
        appliedLanguage.current = true;
        setLanguage(code);
      }
    },
    [setLanguage],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await getCurrentUser();
      setUser(next);
      applyPreferredLanguage(next);
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return null;
      }
      setUser(null);
      return null;
    }
  }, [applyPreferredLanguage]);

  useEffect(() => {
    let cancelled = false;

    refresh()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      await loginAccount(email, password);
      appliedLanguage.current = false;
      await refresh();
    },
    [refresh],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await registerAccount(input);
      appliedLanguage.current = false;
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await logoutAccount();
    } finally {
      appliedLanguage.current = false;
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout }),
    [user, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
