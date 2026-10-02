export const EMPTY_DRAWIO_XML = `<mxfile host="WisePen"><diagram name="Page-1"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;

export type DrawioSaveState = 'saved' | 'dirty' | 'saving' | 'failed';
export type WisePenTheme = 'light' | 'dark';

export type DrawioEditorCommand =
  | {
      action: 'load';
      autosave: 0 | 1;
      modified: boolean;
      noExitBtn: 1;
      noSaveBtn: 0 | 1;
      saveAndExit: 0;
      xml: string;
    }
  | { action: 'status'; message: string; modified: boolean }
  | { action: 'export'; format: 'xml' };

export interface DrawioMessage {
  event?: string;
  xml?: string;
  message?: string;
}

interface BuildDrawioUrlOptions {
  embedUrl: string;
  canEdit: boolean;
  language: string;
  theme: WisePenTheme;
  colorScheme: string;
}

export function decodeBase64Utf8(value?: string | null): string {
  if (!value) return EMPTY_DRAWIO_XML;
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function readDrawioMessage(raw: unknown): DrawioMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as DrawioMessage;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function extractDrawioPlainText(xml: string): string | undefined {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const values = Array.from(doc.querySelectorAll('mxCell[value]'))
      .map((cell) => cell.getAttribute('value') ?? '')
      .filter(Boolean)
      .map((value) => new DOMParser().parseFromString(value, 'text/html').body.textContent ?? '')
      .map((value) => value.trim())
      .filter(Boolean);
    return values.length > 0 ? values.join(' ') : undefined;
  } catch {
    return undefined;
  }
}

export function readDrawioEmbedOrigin(embedUrl: string): string {
  return new URL(embedUrl).origin;
}

export function buildDrawioUrl({
  embedUrl,
  canEdit,
  language,
  theme,
  colorScheme,
}: BuildDrawioUrlOptions): string {
  const url = new URL(embedUrl);
  url.searchParams.set('embed', '1');
  url.searchParams.set('proto', 'json');
  url.searchParams.set('spin', '1');
  url.searchParams.set('pages', '0');
  url.searchParams.set('hide-pages', '1');
  url.searchParams.delete('ui');
  url.searchParams.set('libraries', '1');
  url.searchParams.set('noExitBtn', '1');
  url.searchParams.set('saveAndExit', '0');
  url.searchParams.set('wisepenTheme', theme);
  url.searchParams.set('wisepenColorScheme', colorScheme);
  url.searchParams.set('dark', theme === 'dark' ? '1' : '0');
  url.searchParams.set('lang', language.startsWith('zh') ? 'zh' : 'en');
  if (!canEdit) {
    url.searchParams.set('noSaveBtn', '1');
  }
  return url.toString();
}
