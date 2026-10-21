"use client";

import { Description, Label, ListBox, Select } from "@heroui/react";

export type AppSelectOption = {
  id: string;
  label: string;
  description?: string;
};

type AppSelectProps = {
  label: string;
  options: AppSelectOption[];
  selectedKey?: string;
  onSelectionChange?: (key: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  description?: string;
};

export function AppSelect({
  label,
  options,
  selectedKey,
  onSelectionChange,
  placeholder = "Select",
  isDisabled,
  description,
}: AppSelectProps) {
  return (
    <Select
      className="w-full"
      isDisabled={isDisabled}
      placeholder={placeholder}
      selectedKey={selectedKey}
      variant="secondary"
      onSelectionChange={(key) => {
        if (typeof key === "string") {
          onSelectionChange?.(key);
        }
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {description ? <Description>{description}</Description> : null}
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              <span className="flex flex-col">
                <span>{option.label}</span>
                {option.description ? (
                  <span className="text-sm text-muted">{option.description}</span>
                ) : null}
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
