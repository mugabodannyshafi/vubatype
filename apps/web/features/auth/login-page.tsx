"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { LoadingState } from "@/components/feedback/loading-state";
import { AppButton } from "@/components/ui/app-button";
import { AppTextField } from "@/components/ui/app-text-field";
import { ApiError } from "@/lib/api/http";

export function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/profile");
    }
  }, [loading, router, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/profile");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not log in");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted">Pick up your saved typing progress.</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        <AppTextField
          autoComplete="email"
          isRequired
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
        />
        <AppTextField
          autoComplete="current-password"
          isRequired
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
        />
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <AppButton isPending={submitting} type="submit">
          Log in
        </AppButton>
      </form>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link className="text-link" href="/signup">
          Sign up
        </Link>
      </p>
    </div>
  );
}
