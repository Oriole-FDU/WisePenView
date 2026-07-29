import {
  isAiDiffContentEmpty,
  isAiDiffContentEqual,
  stableStringify,
} from '../../engines/aiDiff/contentState';
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
import {
  applyHighlightAppearance,
  readHighlightBlockProps,
  toHighlightBlockStoredProps,
} from './model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStructuredHighlightAiContent(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ('content' in value || 'props' in value);
}

function resolveAiBlock(
  block: Record<string, unknown>,
  aiContent: unknown
): Record<string, unknown> {
  if (!isStructuredHighlightAiContent(aiContent)) {
    return { ...block, content: aiContent };
  }

  const currentProps = isRecord(block.props) ? block.props : {};
  const candidateProps = isRecord(aiContent.props) ? aiContent.props : {};
  const normalizedProps = toHighlightBlockStoredProps(
    readHighlightBlockProps({
      props: { ...currentProps, ...candidateProps },
    })
  );
  return {
    ...block,
    props: { ...currentProps, ...normalizedProps },
    content: 'content' in aiContent ? aiContent.content : block.content,
  };
}

function resolveHighlightAiDiff(
  block: Record<string, unknown>,
  aiContent: unknown
): NoteAiDiffProjection | null {
  const aiBlock = resolveAiBlock(block, aiContent);
  const currentProps = readHighlightBlockProps(block);
  const nextProps = readHighlightBlockProps(aiBlock);
  if (
    isAiDiffContentEqual(block.content, aiBlock.content) &&
    stableStringify(currentProps) === stableStringify(nextProps)
  ) {
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
  return {
    props: { ...toHighlightBlockStoredProps(readHighlightBlockProps(aiBlock)) },
    content: aiBlock.content,
  };
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

/**
 * 高亮块 AI payload 支持原有 inline content，也支持 `{ content, props }`，
 * 后者可让 AI 单独修改色块、边框、文字颜色或图标。
 */
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
