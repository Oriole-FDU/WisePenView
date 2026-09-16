import { isRecord } from '@/utils/typeGuards';

import { isAiDiffContentEmpty, isAiDiffContentEqual } from '../../engines/aiDiff/contentState';
import type {
  NoteAiDiffAcceptedBlockUpdate,
  NoteAiDiffProjection,
  NoteBlockAiDiff,
} from '../../registry/types';
import {
  createRichTextBlockAiDiff,
  type NoteRichTextAiDiffConfig,
} from '../DefaultContentPlugin/aiDiff';
import styles from './HighlightBlock/style.module.less';
import { applyHighlightAppearance, readHighlightBlockProps } from './model';

function isStructuredHighlightAiContent(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ('content' in value || 'props' in value);
}

function readHighlightAiContent(block: Record<string, unknown>, aiContent: unknown): unknown {
  if (!isStructuredHighlightAiContent(aiContent)) return aiContent;
  return 'content' in aiContent ? aiContent.content : block.content;
}

function resolveAiBlock(
  block: Record<string, unknown>,
  aiContent: unknown
): Record<string, unknown> {
  return { ...block, content: readHighlightAiContent(block, aiContent) };
}

function resolveHighlightAiDiff(
  block: Record<string, unknown>,
  aiContent: unknown
): NoteAiDiffProjection | null {
  const aiBlock = resolveAiBlock(block, aiContent);
  if (isAiDiffContentEqual(block.content, aiBlock.content)) {
    return null;
  }

  const currentEmpty = isAiDiffContentEmpty(block.content);
  const aiContentEmpty = isAiDiffContentEmpty(aiBlock.content);
  return {
    current: block,
    aiBlock,
    currentEmpty,
    aiContentEmpty,
    changeKind: currentEmpty ? 'create' : aiContentEmpty ? 'delete' : 'update',
  };
}

function acceptHighlightAiContent(
  block: Record<string, unknown>,
  aiContent: unknown
): NoteAiDiffAcceptedBlockUpdate {
  const aiBlock = resolveAiBlock(block, aiContent);
  return { content: aiBlock.content };
}

function createHighlightAiRoot(aiBlock: Record<string, unknown>): {
  root: HTMLElement;
  content: HTMLElement;
} {
  const props = readHighlightBlockProps(aiBlock);
  const root = document.createElement('div');
  root.className = styles.root;
  applyHighlightAppearance(root, props);

  const icon = document.createElement('span');
  icon.className = styles.readOnlyIcon;
  icon.textContent = props.icon;

  const content = document.createElement('div');
  content.className = styles.content;
  root.append(icon, content);
  return { root, content };
}

/** 高亮块 AI Diff 只接受内容变化；样式、对齐和图标始终沿用当前块。 */
export function createHighlightBlockAiDiff(config: NoteRichTextAiDiffConfig): NoteBlockAiDiff {
  const richTextAiDiff = createRichTextBlockAiDiff(config);
  return {
    resolve: resolveHighlightAiDiff,
    acceptAiContent: acceptHighlightAiContent,
    renderAiContent(aiBlock, registry) {
      const { root, content } = createHighlightAiRoot(aiBlock);
      content.appendChild(richTextAiDiff.renderAiContent(aiBlock, registry));
      return root;
    },
    comparison: {
      render(current, aiBlock, registry, context) {
        const { root, content } = createHighlightAiRoot(aiBlock);
        content.appendChild(richTextAiDiff.comparison!.render(current, aiBlock, registry, context));
        return root;
      },
    },
  };
}
