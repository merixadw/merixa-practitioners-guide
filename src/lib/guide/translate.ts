export type TranslateLanguage = {
  code: string;
  label: string;
};

/** Page language is English; these are Google Translate target codes. */
export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  { code: "en", label: "English (original)" },
  { code: "ar", label: "Arabic" },
  { code: "bn", label: "Bengali" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "he", label: "Hebrew" },
  { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ms", label: "Malay" },
  { code: "no", label: "Norwegian" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sk", label: "Slovak" },
  { code: "es", label: "Spanish" },
  { code: "sv", label: "Swedish" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "vi", label: "Vietnamese" },
];

export const PAGE_LANGUAGE = "en";
export const TRANSLATE_STORAGE_KEY = "mpg-language";

export function includedLanguageCodes(): string {
  return TRANSLATE_LANGUAGES.map((item) => item.code).join(",");
}

export function readTranslateLanguage(): string {
  try {
    const stored = localStorage.getItem(TRANSLATE_STORAGE_KEY);
    if (stored && TRANSLATE_LANGUAGES.some((item) => item.code === stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors.
  }
  return PAGE_LANGUAGE;
}

export function writeTranslateLanguage(code: string) {
  try {
    if (code === PAGE_LANGUAGE) {
      localStorage.removeItem(TRANSLATE_STORAGE_KEY);
    } else {
      localStorage.setItem(TRANSLATE_STORAGE_KEY, code);
    }
  } catch {
    // Preference still applies via cookie for this session.
  }
}

export function googTransCookieValue(targetCode: string): string {
  if (!targetCode || targetCode === PAGE_LANGUAGE) return "";
  return `/${PAGE_LANGUAGE}/${targetCode}`;
}

export function setGoogTransCookie(targetCode: string) {
  const value = googTransCookieValue(targetCode);
  const base = `${window.location.hostname}`;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();

  if (!value) {
    document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie = `googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${base}`;
    document.cookie = `googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${base}`;
    return;
  }

  const cookie = `googtrans=${value};expires=${expires};path=/`;
  document.cookie = cookie;
  document.cookie = `${cookie};domain=${base}`;
  document.cookie = `${cookie};domain=.${base}`;
}

export function languageLabel(code: string): string {
  return (
    TRANSLATE_LANGUAGES.find((item) => item.code === code)?.label ?? "English"
  );
}
