import { normalizeCodeLanguage, tokenizeCodeLines } from '@/utils/code/codeHighlight';
import { isRecord } from '@/utils/type/typeGuards';

import { renderHighlightedLine } from './highlight';
import { getCodeBlockLanguageLabel } from './language';
import { buildCodeLineDiff, type CodeLineDiffEntry } from './lineDiff';
import styles from './style.module.less';

function readLanguage(aiBlock: Record<string, unknown>): string {
  const props = isRecord(aiBlock.props) ? aiBlock.props : {};
  return normalizeCodeLanguage(typeof props.language === 'string' ? props.language : undefined);
}

function readCode(aiBlock: Record<string, unknown>): string {
  if (typeof aiBlock.content === 'string') return aiBlock.content;
  if (!Array.isArray(aiBlock.content)) return '';
  return aiBlock.content
    .filter(isRecord)
    .map((inline) => (typeof inline.text === 'string' ? inline.text : ''))
    .join('');
}

function createCodeBlockShell(params: {
  language: string;
  languageLabel: string;
  code: HTMLElement;
}): HTMLElement {
  const { language, languageLabel, code } = params;
  const root = document.createElement('div');
  root.className = `bn-block-content ${styles.codeBlockView}`;
  root.contentEditable = 'false';
  root.dataset.contentType = 'codeBlock';
  root.dataset.readOnly = 'true';

  const toolbarWrapper = document.createElement('div');
  toolbarWrapper.className = 'wise-code-block-toolbarWrapper';
  toolbarWrapper.dataset.wiseCodeBlockToolbar = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'wise-code-block-toolbar';
  const languageRoot = document.createElement('div');
  languageRoot.className = 'wise-code-block-language';
  const languageDisplay = document.createElement('div');
  languageDisplay.className = `wise-code-block-languageButton ${styles.readOnlyLanguage}`;
  const label = document.createElement('span');
  label.className = 'wise-code-block-languageLabel';
  label.textContent = languageLabel;
  languageDisplay.appendChild(label);
  languageRoot.appendChild(languageDisplay);
  toolbar.appendChild(languageRoot);
  toolbarWrapper.appendChild(toolbar);

  const pre = document.createElement('pre');
  code.classList.add(`language-${language}`);
  code.dataset.language = language;
  pre.appendChild(code);
  root.append(toolbarWrapper, pre);
  return root;
}

function createLineNumber(entry: CodeLineDiffEntry): HTMLSpanElement {
  const value = entry.kind === 'delete' ? entry.oldLineNumber : entry.newLineNumber;
  const lineNumber = document.createElement('span');
  lineNumber.className = styles.lineNumber;
  lineNumber.textContent = value === undefined ? '' : String(value);
  return lineNumber;
}

function createDiffLine(entry: CodeLineDiffEntry): {
  line: HTMLSpanElement;
  content: HTMLSpanElement;
} {
  const line = document.createElement('span');
  line.className = [
    styles.diffLine,
    entry.kind === 'delete' ? styles.deleteLine : '',
    entry.kind === 'insert' ? styles.insertLine : '',
  ]
    .filter(Boolean)
    .join(' ');
  line.dataset.diffKind = entry.kind;
  line.dataset.lineNumber =
    entry.kind === 'delete' ? String(entry.oldLineNumber ?? '') : String(entry.newLineNumber ?? '');

  const marker = document.createElement('span');
  marker.className = styles.lineMarker;
  marker.textContent = entry.kind === 'delete' ? '-' : entry.kind === 'insert' ? '+' : '';
  const content = document.createElement('span');
  content.className = styles.lineContent;
  content.textContent = entry.text || '\u200B';
  line.append(marker, createLineNumber(entry), content);
  return { line, content };
}

function scheduleLineHighlight(params: {
  root: HTMLElement;
  language: string;
  oldCode: string;
  newCode: string;
  rows: Array<{ entry: CodeLineDiffEntry; content: HTMLSpanElement }>;
}): void {
  const { root, language, oldCode, newCode, rows } = params;
  void (async () => {
    const [oldTokens, newTokens] = await Promise.all([
      tokenizeCodeLines(oldCode, language),
      tokenizeCodeLines(newCode, language),
    ]);
    if (!root.isConnected) return;
    for (const { entry, content } of rows) {
      if (!content.isConnected) return;
      const tokens =
        entry.kind === 'delete'
          ? oldTokens[(entry.oldLineNumber ?? 1) - 1]
          : entry.kind === 'insert'
            ? newTokens[(entry.newLineNumber ?? 1) - 1]
            : (newTokens[(entry.newLineNumber ?? 1) - 1] ??
              oldTokens[(entry.oldLineNumber ?? 1) - 1]);
      renderHighlightedLine(content, tokens, entry.text);
    }
  })();
}

/** 使用代码块原生 DOM 契约渲染只读 AI 候选。 */
export function CodeBlockAiContentView(aiBlock: Record<string, unknown>): HTMLElement {
  const language = readLanguage(aiBlock);
  const codeText = readCode(aiBlock);
  const code = document.createElement('code');
  code.className = `${styles.plainCode} shiki`;
  code.textContent = codeText;
  const root = createCodeBlockShell({
    language,
    languageLabel: getCodeBlockLanguageLabel(language),
    code,
  });
  void (async () => {
    const lines = await tokenizeCodeLines(codeText, language);
    if (!code.isConnected) return;
    code.replaceChildren();
    if (lines.length === 0) {
      code.textContent = codeText;
      return;
    }
    lines.forEach((tokens, index) => {
      const line = document.createElement('span');
      line.className = styles.plainLine;
      renderHighlightedLine(line, tokens, codeText.split('\n')[index] ?? '');
      code.appendChild(line);
      if (index < lines.length - 1) {
        code.appendChild(document.createTextNode('\n'));
      }
    });
  })();
  return root;
}

/** 对比模式隐藏原代码块，改为在同一个代码块内逐行展示新旧差异。 */
export function CodeBlockAiDiffComparisonView(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>
): HTMLElement {
  const aiLanguage = readLanguage(aiBlock);
  const oldCode = readCode(current);
  const newCode = readCode(aiBlock);
  const code = document.createElement('code');
  code.className = styles.lineList;
  const rows: Array<{ entry: CodeLineDiffEntry; content: HTMLSpanElement }> = [];
  buildCodeLineDiff(oldCode, newCode).forEach((entry) => {
    const { line, content } = createDiffLine(entry);
    code.appendChild(line);
    rows.push({ entry, content });
  });
  const root = createCodeBlockShell({
    language: aiLanguage,
    languageLabel: getCodeBlockLanguageLabel(aiLanguage),
    code,
  });
  scheduleLineHighlight({
    root,
    language: aiLanguage,
    oldCode,
    newCode,
    rows,
  });
  return root;
}
