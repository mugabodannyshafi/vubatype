"use client";

import { Button, type ButtonProps } from "@heroui/react";

export function AppButton({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <Button
      className={["font-medium", className].filter(Boolean).join(" ")}
      variant={variant}
      {...props}
    />
  );
}
