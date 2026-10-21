import { apiFetch } from "@/lib/api/http";

import type { AuthUser } from "./users";

export type AuthResponse = {
  access_token: string;
  user: {
    id: string;
    email: string | null;
    username: string;
    display_name: string;
  };
};

export type RegisterInput = {
  username: string;
  display_name: string;
  email: string;
  password: string;
};

export function registerAccount(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginAccount(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAccount(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export type { AuthUser };
