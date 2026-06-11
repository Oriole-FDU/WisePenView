import type { CustomBlockNoteEditor } from '../blockNoteSchema';
import { getProseMirrorRoot } from './editorProseMirrorRoot';

export interface PrintNotePdfOptions {
  /** 文档 `<title>` 与无 titleRoot 时的合成 h1 文案 */
  title?: string;
  /** 克隆自 NoteTitle 的 ProseMirror 根；有则不再插入合成 h1 */
  titleRoot?: HTMLElement | null;
  /** 打印 DOM 末尾追加的批注摘要区 */
  commentsSection?: HTMLElement | null;
}

const PRINT_IFRAME_STYLE =
  'position:fixed;width:0;height:0;right:0;bottom:0;border:0;opacity:0;pointer-events:none;visibility:hidden;';

const PRINT_IFRAME_CLEANUP_MS = 120_000;
const STYLESHEET_LOAD_TIMEOUT_MS = 5_000;

const PRINT_SUPPLEMENTAL_CSS = `
  @page { size: A4; margin: 18mm 16mm 20mm; }
  html,
  body {
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    padding: 0 8px;
    box-sizing: border-box;
  }
  .print-doc-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 1em;
    letter-spacing: 0.02em;
    color: #111;
    page-break-after: avoid;
  }
  .note-print-title {
    margin: 0 0 1em;
    page-break-after: avoid;
    color: #111;
  }
  .note-print-title .bn-editor {
    padding-block: 0 !important;
    padding-bottom: 8px !important;
  }
  .note-print-content {
    margin: 0;
  }
  .note-print-layout {
    display: block;
  }
  .note-print-layout-with-comments {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 58mm;
    column-gap: 8mm;
    align-items: start;
  }
  .note-print-body {
    color: #111;
  }
  .note-print-body img,
  .note-print-title img {
    max-width: 100% !important;
    height: auto !important;
  }
  @media print {
    .note-print-body .bn-editor,
    .note-print-title .bn-editor {
      padding-bottom: 8px !important;
    }
  }
  .note-print-body .bn-editor .katex-display,
  .note-print-title .katex-display {
    margin: 0.6em 0 !important;
  }
  .note-print-comments {
    margin: 0;
    padding: 0 0 0 6mm;
    border-left: 1px solid #e5e7eb;
    page-break-before: auto;
  }
  .note-print-comments-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 0.75em;
    color: #111;
  }
  .note-print-comment-thread {
    margin: 0 0 1em;
    padding: 0.65em;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
    page-break-inside: avoid;
  }
  .note-print-comment-reference {
    margin: 0 0 0.5em;
    font-size: 13px;
    color: #374151;
    font-weight: 500;
  }
  .note-print-comment-status {
    margin: 0 0 0.5em;
    font-size: 12px;
    color: #6b7280;
  }
  .note-print-comment-list {
    margin: 0;
    padding-left: 0;
    font-size: 13px;
    color: #111;
    list-style: none;
  }
  .note-print-comment-item {
    margin: 0.5em 0;
  }
  .note-print-comment-author {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
    color: #111827;
  }
  .note-print-comment-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    object-fit: cover;
    flex: 0 0 auto;
    background: #e5e7eb;
  }
  .note-print-comment-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #4b5563;
  }
  .note-print-comment-username {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .note-print-comment-text {
    display: block;
    font-size: 13px;
    line-height: 1.55;
    color: #111827;
    overflow-wrap: anywhere;
  }
  @media print {
    .note-print-layout-with-comments {
      grid-template-columns: minmax(0, 1fr) 58mm;
    }
  }
  .note-print-body [data-ai-diff-block-display-hidden='true'],
  .note-print-body .bn-block-outer:has(> .bn-block-content [data-ai-diff-block-display-hidden='true']),
  .note-print-body .bn-block-outer:has([data-ai-diff-block-display-hidden='true']) {
    display: none !important;
  }
  .note-print-body [class*='aiActionsRoot'],
  .note-print-body [class*='aiActionsAnchor'],
  .note-print-body [class*='aiDiffInlineStrategyHidden'] {
    display: none !important;
    visibility: hidden !important;
    max-width: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
  }
  .note-print-body [class*='mathDiffActionLayer'],
  .note-print-body [class*='mathDiffActions'] {
    display: none !important;
    visibility: hidden !important;
  }
`;

/** 等待编辑器完成一轮 React 绘制与布局（双 rAF），供打印前切换 AIDiff 展示模式后使用。 */
export function waitForEditorPaint(): Promise<void> {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function cloneHostStylesInto(targetHead: HTMLHeadElement, sourceDoc: Document = document): void {
  const targetDoc = targetHead.ownerDocument;
  const seenHref = new Set<string>();

  for (const node of sourceDoc.head.querySelectorAll('link[rel="stylesheet"]')) {
    const link = node as HTMLLinkElement;
    const href = link.href || link.getAttribute('href');
    if (!href || seenHref.has(href)) continue;
    seenHref.add(href);

    const copy = targetDoc.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = link.href || href;
    if (link.media) copy.media = link.media;
    const co = link.crossOrigin;
    if (co === 'anonymous' || co === 'use-credentials') copy.crossOrigin = co;
    targetHead.appendChild(copy);
  }

  for (const node of sourceDoc.head.querySelectorAll('style')) {
    try {
      targetHead.appendChild(targetDoc.importNode(node, true));
    } catch {
      const fallback = targetDoc.createElement('style');
      fallback.textContent = node.textContent;
      targetHead.appendChild(fallback);
    }
  }
}

async function waitForPrintIframeReady(win: Window): Promise<void> {
  await new Promise<void>((resolve) => {
    if (win.document.readyState === 'complete') resolve();
    else win.addEventListener('load', () => resolve(), { once: true });
  });

  const sheets = [
    ...win.document.head.querySelectorAll('link[rel="stylesheet"]'),
  ] as HTMLLinkElement[];

  await Promise.all(
    sheets.map(
      (link) =>
        new Promise<void>((resolve) => {
          try {
            if (link.sheet) {
              resolve();
              return;
            }
          } catch {
            resolve();
            return;
          }
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
          window.setTimeout(resolve, STYLESHEET_LOAD_TIMEOUT_MS);
        })
    )
  );

  try {
    const fonts = win.document.fonts ?? document.fonts;
    if (fonts) await fonts.ready;
  } catch {
    void 0;
  }

  await new Promise<void>((resolve) =>
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))
  );
}

function buildPrintDocument(
  doc: Document,
  proseMirrorRoot: HTMLElement,
  options?: PrintNotePdfOptions
): void {
  const titleText = options?.title?.trim() ?? '';
  const titleRoot = options?.titleRoot ?? null;

  const titleEl = doc.createElement('title');
  titleEl.textContent = titleText || '笔记';
  doc.head.appendChild(titleEl);

  const styleEl = doc.createElement('style');
  styleEl.textContent = PRINT_SUPPLEMENTAL_CSS;
  doc.head.appendChild(styleEl);

  const article = doc.createElement('article');
  article.className = 'note-print-body';

  if (titleRoot) {
    const titleHost = doc.createElement('div');
    titleHost.className = 'note-print-title';
    titleHost.appendChild(doc.importNode(titleRoot, true));
    article.appendChild(titleHost);
  } else if (titleText) {
    const h1 = doc.createElement('h1');
    h1.className = 'print-doc-title';
    h1.textContent = titleText;
    article.appendChild(h1);
  }

  const layout = doc.createElement('div');
  layout.className = options?.commentsSection
    ? 'note-print-layout note-print-layout-with-comments'
    : 'note-print-layout';

  const contentHost = doc.createElement('div');
  contentHost.className = 'note-print-content';
  contentHost.appendChild(doc.importNode(proseMirrorRoot, true));
  layout.appendChild(contentHost);

  if (options?.commentsSection) {
    layout.appendChild(doc.importNode(options.commentsSection, true));
  }

  article.appendChild(layout);
  doc.body.appendChild(article);
}

/**
 * 通过系统「打印 → 另存为 PDF」：克隆正文 ProseMirror DOM，样式来自宿主页 head + 补充 CSS。
 *
 * 使用同页隐藏 iframe 触发 print，避免 await 之后 window.open 被弹窗拦截。
 */
export async function printNotePdfViaBrowser(
  editor: CustomBlockNoteEditor,
  options?: PrintNotePdfOptions
): Promise<void> {
  const proseMirrorRoot = getProseMirrorRoot(editor);
  if (!proseMirrorRoot) {
    throw new Error('无法获取编辑器内容，导出已取消');
  }

  const iframe = document.createElement('iframe');
  iframe.title = '笔记打印';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = PRINT_IFRAME_STYLE;
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    throw new Error('无法创建打印区域，导出已取消');
  }

  const removeFrame = () => {
    try {
      iframe.remove();
    } catch {
      void 0;
    }
  };

  try {
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>');
    doc.close();

    cloneHostStylesInto(doc.head);
    buildPrintDocument(doc, proseMirrorRoot, options);

    await waitForPrintIframeReady(win);

    win.focus();
    win.addEventListener('afterprint', () => removeFrame(), { once: true });
    window.setTimeout(removeFrame, PRINT_IFRAME_CLEANUP_MS);
    win.print();
  } catch (error) {
    removeFrame();
    throw error;
  }
}
