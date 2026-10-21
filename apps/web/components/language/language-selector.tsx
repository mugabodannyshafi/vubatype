"use client";

import { ListBox, Select } from "@heroui/react";

import { useTypingSettingsLock } from "@/components/typing/typing-settings-lock";
import { LANGUAGES } from "@/lib/constants/languages";

import { useTypingLanguage } from "./language-provider";

export function LanguageSelector() {
  const { language, setLanguage } = useTypingLanguage();
  const { locked } = useTypingSettingsLock();

  return (
    <Select
      aria-label="Typing language"
      className="w-32 sm:w-36"
      isDisabled={locked}
      selectedKey={language}
      variant="secondary"
      onSelectionChange={(key) => {
        if (locked) {
          return;
        }
        if (key === "rw" || key === "en") {
          setLanguage(key);
        }
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {LANGUAGES.map((option) => (
            <ListBox.Item key={option.code} id={option.code} textValue={option.name}>
              {option.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
