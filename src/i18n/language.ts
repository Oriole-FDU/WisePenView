import i18n from 'i18next';

import { STORAGE_KEYS } from '@/constants/storageKeys';

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources';

/** 界面语言选项，labelKey 位于 common 命名空间 */
export const LANGUAGE_OPTIONS: Array<{ id: SupportedLanguage; labelKey: string }> = [
  { id: 'zh-CN', labelKey: 'language.zhCN' },
  { id: 'en-US', labelKey: 'language.enUS' },
];

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

  const persistedLanguage = normalizeLanguage(window.localStorage.getItem(STORAGE_KEYS.language));
  if (persistedLanguage) return persistedLanguage;

  for (const browserLanguage of window.navigator.languages) {
    const supportedLanguage = normalizeLanguage(browserLanguage);
    if (supportedLanguage) return supportedLanguage;
  }

  return normalizeLanguage(window.navigator.language) ?? DEFAULT_LANGUAGE;
}

/** 读取当前生效的界面语言；i18n 未就绪时回退到首次解析结果 */
export function readCurrentLanguage(): SupportedLanguage {
  return normalizeLanguage(i18n.resolvedLanguage) ?? resolveInitialLanguage();
}

export function persistLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.language, language);
}

export function syncDocumentLanguage(language: SupportedLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}
