import { codeBlockOptions } from '@blocknote/code-block';

import { normalizeCodeLanguage } from '@/utils/code/codeHighlight';

import type { CodeBlockLanguageOption } from './CodeBlockToolbar';

const BASE_LANGUAGE_OPTIONS: CodeBlockLanguageOption[] = Object.entries(
  codeBlockOptions.supportedLanguages ?? {}
).map(([id, { name }]) => ({ id, label: name }));

export function getCodeBlockLanguageOptions(language: string): CodeBlockLanguageOption[] {
  const normalizedLanguage = normalizeCodeLanguage(language);
  if (BASE_LANGUAGE_OPTIONS.some((option) => option.id === normalizedLanguage)) {
    return BASE_LANGUAGE_OPTIONS;
  }
  return [{ id: normalizedLanguage, label: normalizedLanguage }, ...BASE_LANGUAGE_OPTIONS];
}

export function getCodeBlockLanguageLabel(language: string): string {
  const normalizedLanguage = normalizeCodeLanguage(language);
  return (
    getCodeBlockLanguageOptions(normalizedLanguage).find(
      (option) => option.id === normalizedLanguage
    )?.label ?? normalizedLanguage
  );
}
