import type { CodeHighlightToken } from '@/utils/code/codeHighlight';

/** 把一行 tokens 渲进容器；保留 Shiki 配色。 */
export function renderHighlightedLine(
  container: HTMLElement,
  tokens: readonly CodeHighlightToken[] | undefined,
  fallbackText: string
): void {
  container.classList.add('shiki');
  container.replaceChildren();
  if (!tokens || tokens.length === 0) {
    container.textContent = fallbackText || '\u200B';
    return;
  }
  for (const token of tokens) {
    const span = document.createElement('span');
    span.textContent = token.content;
    if (token.color) {
      span.style.setProperty('color', token.color);
    }
    if (token.fontStyle) {
      // Shiki FontStyle: italic=1, bold=2, underline=4
      if (token.fontStyle & 1) span.style.fontStyle = 'italic';
      if (token.fontStyle & 2) span.style.fontWeight = 'bold';
      if (token.fontStyle & 4) span.style.textDecoration = 'underline';
    }
    container.appendChild(span);
  }
}
