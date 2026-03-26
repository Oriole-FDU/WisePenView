import katex from 'katex';

/**
 * 与 MathBlock / InlineMath 共用的 KaTeX 渲染；失败时回退为纯文本。
 */
export function renderKatexInto(
  el: HTMLElement,
  latex: string,
  placeholderClass: string,
  displayMode: boolean
): void {
  el.replaceChildren();
  const trimmed = latex.trim();
  if (!trimmed) {
    const span = document.createElement('span');
    span.className = placeholderClass;
    span.textContent = '点击输入公式...';
    el.appendChild(span);
    return;
  }
  try {
    katex.render(latex, el, { throwOnError: false, displayMode });
  } catch {
    el.textContent = latex;
  }
}
