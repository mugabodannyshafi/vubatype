"use client";

import { Skeleton, Spinner } from "@heroui/react";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3 py-4" role="status">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner size="sm" />
        {label}
      </p>
      <Skeleton className="h-4 w-3/5 rounded-md" />
      <Skeleton className="h-4 w-4/5 rounded-md" />
      <Skeleton className="h-4 w-2/5 rounded-md" />
    </div>
  );
}
