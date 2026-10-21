"use client";

import { Description, FieldError, Input, Label, TextField } from "@heroui/react";

type AppTextFieldProps = {
  label: string;
  name?: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  description?: string;
  errorMessage?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoComplete?: string;
};

export function AppTextField({
  label,
  name,
  type = "text",
  placeholder,
  description,
  errorMessage,
  value,
  defaultValue,
  onChange,
  isRequired,
  isDisabled,
  autoComplete,
}: AppTextFieldProps) {
  const isInvalid = Boolean(errorMessage);

  return (
    <TextField
      className="w-full"
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      name={name}
      type={type}
      value={value}
      variant="secondary"
      onChange={onChange}
    >
      <Label>{label}</Label>
      <Input placeholder={placeholder} />
      {description ? <Description>{description}</Description> : null}
      {isInvalid ? <FieldError>{errorMessage}</FieldError> : null}
    </TextField>
  );
}

export type { AppTextFieldProps };
