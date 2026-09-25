import { normalizeCodeLanguage } from '@/utils/code/codeHighlight';

export function isMermaidLanguage(language: string | undefined): boolean {
  return normalizeCodeLanguage(language) === 'mermaid';
}
