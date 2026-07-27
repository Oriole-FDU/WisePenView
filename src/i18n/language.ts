import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources';

const LANGUAGE_STORAGE_KEY = 'wisepen:language';

function normalizeLanguage(language: string | null | undefined): SupportedLanguage | undefined {
  if (!language) return undefined;
  const normalized = language.toLowerCase();
  return SUPPORTED_LANGUAGES.find(
    (supportedLanguage) =>
      supportedLanguage.toLowerCase() === normalized ||
      supportedLanguage.split('-')[0]?.toLowerCase() === normalized.split('-')[0]
  );
}

export function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  const persistedLanguage = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  if (persistedLanguage) return persistedLanguage;

  for (const browserLanguage of window.navigator.languages) {
    const supportedLanguage = normalizeLanguage(browserLanguage);
    if (supportedLanguage) return supportedLanguage;
  }

  return normalizeLanguage(window.navigator.language) ?? DEFAULT_LANGUAGE;
}

export function persistLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function syncDocumentLanguage(language: SupportedLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}
