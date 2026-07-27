import i18n from '@/i18n';
import { createClientError, FRONTEND_CLIENT_ERROR, isWisePenError } from '@/utils/error';
import { collectNotePrintStyles } from '../../registry';
import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NotePluginRegistry } from '../../registry/types';
import { getProseMirrorRoot } from '../editor/dom';

interface PrintNotePdfOptions {
  /** 文档 `<title>` 与无 titleRoot 时的合成 h1 文案 */
  title?: string;
  /** 克隆自 NoteTitle 的 ProseMirror 根；有则不再插入合成 h1 */
  titleRoot?: HTMLElement | null;
}

const PRINT_IFRAME_STYLE =
  'position:fixed;width:0;height:0;right:0;bottom:0;border:0;opacity:0;pointer-events:none;visibility:hidden;';

const PRINT_IFRAME_CLEANUP_MS = 120_000;
const STYLESHEET_LOAD_TIMEOUT_MS = 5_000;

const PRINT_BASE_CSS = `
  @page { size: A4; margin: 18mm 16mm 20mm; }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
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
    color: var(--foreground, #111827);
    font-family: var(--app-font-family, sans-serif);
  }
  .print-doc-title {
    font-size: 34px;
    font-weight: 500;
    line-height: 1.625;
    margin: 0 0 1em;
    color: inherit;
    page-break-after: avoid;
  }
  .note-print-title {
    margin: 0 0 1em;
    page-break-after: avoid;
    color: inherit;
  }
  .note-print-scope {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
  }
  .note-print-content {
    margin: 0;
  }
  .note-print-body {
    color: inherit;
  }
  .note-print-body img,
  .note-print-title img {
    max-width: 100% !important;
    height: auto !important;
  }
  .note-print-body .bn-editor {
    padding-bottom: 0 !important;
  }
  .note-print-body .bodyBlockNoteView {
    padding-right: 0 !important;
  }
  .note-print-body figure,
  .note-print-body img {
    break-inside: avoid-page;
    page-break-inside: avoid;
  }
  .note-print-body .bn-side-menu,
  .note-print-body .bn-formatting-toolbar,
  .note-print-body .bn-slash-menu,
  .note-print-body .bn-table-handle,
  .note-print-body .column-resize-handle,
  .note-print-body .bn-table-drop-cursor {
    display: none !important;
  }
  .note-print-body [data-show-selection] {
    background-color: transparent !important;
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

  await Promise.all(
    [...win.document.images].map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
          window.setTimeout(resolve, STYLESHEET_LOAD_TIMEOUT_MS);
        })
    )
  );

  await new Promise<void>((resolve) =>
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))
  );
}

/**
 * 保留 ProseMirror 到 BlockNote React 外壳的节点路径，使 CSS Module 的作用域选择器在打印文档中继续生效。
 * 仅克隆路径本身，不带入工具栏等兄弟节点。
 */
function cloneEditorWithStyleScope(doc: Document, proseMirrorRoot: HTMLElement): HTMLElement {
  const blockNoteContainer = proseMirrorRoot.closest<HTMLElement>('.bn-container');
  if (!blockNoteContainer) {
    return doc.importNode(proseMirrorRoot, true);
  }

  const styleScope = blockNoteContainer.parentElement ?? blockNoteContainer;
  let clonedPath = doc.importNode(proseMirrorRoot, true);
  let sourceParent = proseMirrorRoot.parentElement;

  while (sourceParent) {
    const clonedParent = doc.importNode(sourceParent, false);
    clonedParent.appendChild(clonedPath);
    clonedPath = clonedParent;
    if (sourceParent === styleScope) break;
    sourceParent = sourceParent.parentElement;
  }

  clonedPath.classList.add('note-print-scope');
  return clonedPath;
}

function buildPrintDocument(
  doc: Document,
  proseMirrorRoot: HTMLElement,
  registry: NotePluginRegistry,
  options?: PrintNotePdfOptions
): void {
  const titleText = options?.title?.trim() ?? '';
  const titleRoot = options?.titleRoot ?? null;

  const titleEl = doc.createElement('title');
  titleEl.textContent = titleText || i18n.t('export.printDocumentTitle', { ns: 'note' });
  doc.head.appendChild(titleEl);

  const styleEl = doc.createElement('style');
  styleEl.textContent = `${PRINT_BASE_CSS}\n${collectNotePrintStyles(registry)}`;
  doc.head.appendChild(styleEl);

  const article = doc.createElement('article');
  article.className = 'note-print-body';

  if (titleRoot) {
    const titleHost = doc.createElement('div');
    titleHost.className = 'note-print-title';
    titleHost.appendChild(cloneEditorWithStyleScope(doc, titleRoot));
    article.appendChild(titleHost);
  } else if (titleText) {
    const h1 = doc.createElement('h1');
    h1.className = 'print-doc-title';
    h1.textContent = titleText;
    article.appendChild(h1);
  }

  const contentHost = doc.createElement('div');
  contentHost.className = 'note-print-content';
  contentHost.appendChild(cloneEditorWithStyleScope(doc, proseMirrorRoot));
  article.appendChild(contentHost);
  doc.body.appendChild(article);
}

/**
 * 通过系统「打印 → 另存为 PDF」：克隆正文 ProseMirror DOM，样式来自宿主页 head + 补充 CSS。
 *
 * 使用同页隐藏 iframe 触发 print，避免 await 之后 window.open 被弹窗拦截。
 */
export async function printNotePdfViaBrowser(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  options?: PrintNotePdfOptions
): Promise<void> {
  const proseMirrorRoot = getProseMirrorRoot(editor);
  if (!proseMirrorRoot) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_EXPORT_FAILED, {
      reason: '无法获取编辑器内容',
    });
  }

  const iframe = document.createElement('iframe');
  iframe.title = i18n.t('export.printFrameTitle', { ns: 'note' });
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = PRINT_IFRAME_STYLE;
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_EXPORT_FAILED, {
      reason: '无法创建打印区域',
    });
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
    buildPrintDocument(doc, proseMirrorRoot, registry, options);

    await waitForPrintIframeReady(win);

    win.focus();
    win.addEventListener('afterprint', () => removeFrame(), { once: true });
    window.setTimeout(removeFrame, PRINT_IFRAME_CLEANUP_MS);
    win.print();
  } catch (error) {
    removeFrame();
    if (isWisePenError(error)) throw error;
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_EXPORT_FAILED, undefined, error);
  }
}
