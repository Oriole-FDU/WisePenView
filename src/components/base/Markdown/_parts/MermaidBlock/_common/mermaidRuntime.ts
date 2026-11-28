import type { Mermaid } from 'mermaid';

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

/** Mermaid 使用全局配置，仅在首次图形渲染时初始化。 */
async function getMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = (async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        htmlLabels: false,
        theme: 'neutral',
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      });
      return mermaid;
    })();
  }
  return mermaidPromise;
}

export async function renderMermaidDiagram(id: string, source: string): Promise<string> {
  const mermaid = await getMermaid();
  const { svg } = await mermaid.render(id, source);
  return preserveSvgCanvasSize(svg);
}
