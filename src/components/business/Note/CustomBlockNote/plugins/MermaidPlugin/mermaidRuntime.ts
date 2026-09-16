import type { Mermaid } from 'mermaid';

import i18n from '@/i18n';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

/** Mermaid 源码最大长度，避免超大图表触发高耗时解析和布局计算。 */
export const NOTE_MERMAID_SOURCE_MAX_LENGTH = 50_000;

let mermaidPromise: Promise<Mermaid> | null = null;

function preserveSvgCanvasSize(svgMarkup: string): string {
  const document = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const svg = document.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') return svgMarkup;

  const viewBox = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/\s+/)
    .map((value) => Number(value));
  const width = viewBox?.[2];
  const height = viewBox?.[3];
  if (
    width === undefined ||
    height === undefined ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return svgMarkup;
  }

  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.style.setProperty('max-width', 'none');
  return new XMLSerializer().serializeToString(svg);
}

/** Note 使用独立 Mermaid runtime，避免与聊天渲染组件形成依赖。 */
async function getNoteMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = (async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        htmlLabels: false,
        theme: 'neutral',
        maxTextSize: NOTE_MERMAID_SOURCE_MAX_LENGTH,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      });
      return mermaid;
    })();
  }
  return mermaidPromise;
}

export async function renderNoteMermaidDiagram(id: string, source: string): Promise<string> {
  if (source.length > NOTE_MERMAID_SOURCE_MAX_LENGTH) {
    const error = createClientError(FRONTEND_CLIENT_ERROR.VALIDATION);
    error.message = i18n.t('mermaid.sourceTooLong', {
      ns: 'note',
      maxLength: NOTE_MERMAID_SOURCE_MAX_LENGTH.toLocaleString(),
    });
    throw error;
  }

  const mermaid = await getNoteMermaid();
  const { svg } = await mermaid.render(id, source);
  return preserveSvgCanvasSize(svg);
}
