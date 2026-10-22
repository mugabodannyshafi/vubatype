"use client";

import { Button, Spinner, type ButtonProps } from "@heroui/react";
import type { ReactNode } from "react";

type AppButtonProps = Omit<ButtonProps, "children"> & {
  children?: ReactNode;
};

export function AppButton({ children, className, isPending = false, variant = "primary", ...props }: AppButtonProps) {
  return (
    <Button
      className={["font-medium", className].filter(Boolean).join(" ")}
      isPending={isPending}
      variant={variant}
      {...props}
    >
      {isPending ? <Spinner size="sm" /> : null}
      {children}
    </Button>
  );
}
