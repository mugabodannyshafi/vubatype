export const LANGUAGES = [
  { code: "rw", name: "Kinyarwanda" },
  { code: "en", name: "English" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "rw";

export const LANGUAGE_STORAGE_KEY = "vubatype-language";

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function getLanguageName(code: LanguageCode): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? code;
}
