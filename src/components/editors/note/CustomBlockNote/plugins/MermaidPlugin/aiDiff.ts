import type { NoteBlockAiDiff } from '../../registry/types';
import { createMermaidAiDiffPanel } from './MermaidAiDiffPanel';
import styles from './MermaidBlock/style.module.less';
import { readMermaidSource } from './source';

function isMermaidContent(value: unknown): value is string | unknown[] {
  return typeof value === 'string' || Array.isArray(value);
}

function createMermaidDiffPanel(
  source: string,
  toneClassName: string,
  diffKind?: 'delete' | 'insert'
): HTMLElement {
  return createMermaidAiDiffPanel({ source, toneClassName, diffKind });
}

function renderMermaidAiContent(aiBlock: Record<string, unknown>): HTMLElement {
  return createMermaidDiffPanel(readMermaidSource(aiBlock.content), styles.aiDiffPlain);
}

/** Mermaid DSL 不适合逐词审阅，更新时以上旧下新的预览/源码面板对照。 */
export const mermaidBlockAiDiff: NoteBlockAiDiff = {
  resolve(block, aiContent) {
    if (!isMermaidContent(aiContent)) return null;

    const currentSource = readMermaidSource(block.content);
    const aiSource = readMermaidSource(aiContent);
    if (currentSource === aiSource) return null;
    return {
      current: block,
      aiBlock: { ...block, content: aiContent },
      currentEmpty: currentSource.length === 0,
      aiContentEmpty: aiSource.length === 0,
      changeKind:
        currentSource.length === 0 ? 'create' : aiSource.length === 0 ? 'delete' : 'update',
    };
  },
  acceptAiContent(_block, aiContent) {
    return isMermaidContent(aiContent) ? { content: aiContent } : null;
  },
  renderAiContent: renderMermaidAiContent,
  comparison: {
    render(current, aiBlock) {
      const root = document.createElement('div');
      root.className = styles.aiDiffComparison;
      root.append(
        createMermaidDiffPanel(readMermaidSource(current.content), styles.aiDiffRemoved, 'delete'),
        createMermaidDiffPanel(readMermaidSource(aiBlock.content), styles.aiDiffAdded, 'insert')
      );
      return root;
    },
  },
};
