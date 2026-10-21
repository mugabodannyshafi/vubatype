export const LANGUAGES = [
  { code: "rw", name: "Kinyarwanda" },
  { code: "en", name: "English" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "rw";

export const LANGUAGE_STORAGE_KEY = "vubatype-language";

export const TYPING_SAMPLES: Record<LanguageCode, string> = {
  rw: "Muraho, urashaka kwandika vuba? Twandika amagambo mu Kinyarwanda no mu Cyongereza. Gerageza gutsinda inshuti zawe mu isiganwa. Soma neza, ukande neza, kandi wite ku makosa.",
  en: "How fast can you type today? Practice words in Kinyarwanda or English. Try to beat your friends in a race. Read carefully, type cleanly, and watch for mistakes.",
};

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function getLanguageName(code: LanguageCode): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? code;
}
