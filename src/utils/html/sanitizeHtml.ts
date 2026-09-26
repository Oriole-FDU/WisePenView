import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';

export type SanitizeHtmlConfig = DOMPurifyConfig;

export const MATH_HTML_SANITIZE_CONFIG: SanitizeHtmlConfig = {
  USE_PROFILES: { html: true, mathMl: true },
};

export const SVG_HTML_SANITIZE_CONFIG: SanitizeHtmlConfig = {
  USE_PROFILES: { svg: true, svgFilters: true },
};

export const SEARCH_HIGHLIGHT_SANITIZE_CONFIG: SanitizeHtmlConfig = {
  ALLOWED_TAGS: ['em'],
  ALLOWED_ATTR: ['class'],
};

export function sanitizeHtml(markup: string, config?: SanitizeHtmlConfig): string {
  return DOMPurify.sanitize(markup, config);
}
