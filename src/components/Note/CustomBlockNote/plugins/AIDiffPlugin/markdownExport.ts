import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';

import { isInlineVisibleInMode, isRecord, shouldFoldInlineContent } from './exportVisibility';
import { applyAiDiffActionToProps, type AiDiffActionMode } from './patch';

function getInlineType(v: unknown): string {
  if (!isRecord(v)) return '';
  const type = v.type;
  return typeof type === 'string' ? type : '';
}

function getInlineText(v: unknown): string {
  if (!isRecord(v)) return '';
  const text = v.text;
  return typeof text === 'string' ? text : '';
}

function getInlineFieldString(v: unknown, key: string): string {
  if (!isRecord(v)) return '';
  const value = v[key];
  return typeof value === 'string' ? value : '';
}

function getInlineProps(v: unknown): Record<string, unknown> | null {
  if (!isRecord(v)) return null;
  const props = v.props;
  if (typeof props !== 'object' || props === null) return null;
  return props as Record<string, unknown>;
}

function getPropString(props: Record<string, unknown> | null, key: string): string {
  const value = props?.[key];
  return typeof value === 'string' ? value : '';
}

function copyInlineStyles(item: unknown): Record<string, string> | undefined {
  if (!isRecord(item)) return undefined;
  const styles = item.styles;
  if (typeof styles !== 'object' || styles === null) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(styles)) {
    if (typeof v === 'string') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function toExportTextInline(
  text: string,
  source: unknown
): { type: 'text'; text: string; styles?: Record<string, string> } {
  const styles = copyInlineStyles(source);
  return styles ? { type: 'text', text, styles } : { type: 'text', text };
}

function modeToAiDiffAction(displayMode: AiDiffDisplayMode): AiDiffActionMode | null {
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return 'accept';
  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return 'discard';
  return null;
}

/**
 * 将单条行内映射为导出用形态：不可见则 `null`；遗留 AI-* 在 OLD_ONLY 下落成普通 `text`。
 */
function mapInlineForExport(item: unknown, displayMode: AiDiffDisplayMode): unknown | null {
  if (!isInlineVisibleInMode(item, displayMode)) {
    return null;
  }

  const type = getInlineType(item);

  if (type === 'inlineMath') {
    const mode = modeToAiDiffAction(displayMode);
    if (!mode) return item;
    const propsAction = applyAiDiffActionToProps(getInlineProps(item), mode);
    if (propsAction.kind === 'remove') return null;
    if (propsAction.kind === 'update') {
      return {
        ...(isRecord(item) ? item : {}),
        props: propsAction.props,
      };
    }
    return item;
  }

  if (type === 'ai-diff' && displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    const origin = getPropString(getInlineProps(item), 'origin');
    return origin ? toExportTextInline(origin, item) : null;
  }

  if (type === 'AI-Edit' && displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    const origin = getInlineFieldString(item, 'old_text');
    return origin ? toExportTextInline(origin, item) : null;
  }

  if (type === 'AI-Edit' && displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    const replace = getInlineFieldString(item, 'new_text');
    return replace ? toExportTextInline(replace, item) : null;
  }

  if (type === 'ai-diff' && displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    const replace = getPropString(getInlineProps(item), 'replace');
    return replace ? toExportTextInline(replace, item) : null;
  }

  if (type === 'AI-Create' || type === 'AI-Delete') {
    const text = getInlineText(item);
    return text ? toExportTextInline(text, item) : null;
  }

  return item;
}

function filterBlockForExport(block: unknown, displayMode: AiDiffDisplayMode): unknown | null {
  if (!isRecord(block)) return null;

  const blockType = typeof block.type === 'string' ? block.type : '';
  if (blockType === 'math') {
    const mode = modeToAiDiffAction(displayMode);
    if (!mode) return block;
    const propsAction = applyAiDiffActionToProps(block.props, mode);
    if (propsAction.kind === 'remove') return null;
    if (propsAction.kind === 'update') {
      return {
        ...block,
        props: propsAction.props,
      };
    }
    return block;
  }

  const rawContent = Array.isArray(block.content) ? (block.content as unknown[]) : [];

  if (shouldFoldInlineContent(rawContent, displayMode)) {
    return null;
  }

  const filteredContent = rawContent
    .map((item) => mapInlineForExport(item, displayMode))
    .filter((item): item is unknown => item !== null);

  let filteredChildren: unknown[] = [];
  if (Array.isArray(block.children)) {
    filteredChildren = block.children
      .map((child) => filterBlockForExport(child, displayMode))
      .filter((child): child is unknown => child !== null);
  }

  return {
    ...block,
    content: filteredContent,
    children: filteredChildren,
  };
}

/**
 * 按指定 AIDiff 展示模式过滤文档块树，供 Markdown 下载使用。
 * 默认 `OLD_ONLY`（仅旧文本）。
 */
export function filterDocumentBlocksForAiDiffExport(
  blocks: readonly unknown[],
  displayMode: AiDiffDisplayMode = AI_DIFF_DISPLAY_MODE.OLD_ONLY
): unknown[] {
  return blocks
    .map((block) => filterBlockForExport(block, displayMode))
    .filter((block): block is unknown => block !== null);
}
