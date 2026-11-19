import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';
import { isRecord } from '@/utils/type/typeGuards';

import type { NotePluginRegistry } from '../../registry/types';
import { resolveNoteAiDiffBlock } from '../aiDiff/contentState';

function assertInlineContentRegistered(content: unknown, registry: NotePluginRegistry): void {
  if (!Array.isArray(content)) return;
  for (const inline of content) {
    if (!isRecord(inline)) continue;
    const type = typeof inline.type === 'string' ? inline.type : '';
    if (!registry.inlinePlugins.has(type)) {
      throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE, {
        reason: `Note inline type 缺少 owner：${type || 'unknown'}`,
      });
    }
  }
}

function projectBlock(
  block: unknown,
  registry: NotePluginRegistry,
  aiDiffDisplayMode: AiDiffDisplayMode,
  aiContentByBlockId: ReadonlyMap<string, unknown>
): Record<string, unknown> | null {
  if (!isRecord(block)) return null;
  const type = typeof block.type === 'string' ? block.type : '';
  const owner = registry.blockPlugins.get(type);
  if (!owner) {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE, {
      reason: `Note block type 缺少 owner：${type || 'unknown'}`,
    });
  }

  const blockId = typeof block.id === 'string' ? block.id : '';
  const aiContent = aiContentByBlockId.get(blockId);
  const aiProjection =
    aiContentByBlockId.has(blockId) && owner.aiDiff
      ? resolveNoteAiDiffBlock(block, aiContent, owner.aiDiff, registry)
      : null;
  if (
    aiProjection &&
    ((aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY && aiProjection.aiContentEmpty) ||
      (aiDiffDisplayMode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY && aiProjection.currentEmpty))
  ) {
    return null;
  }
  const snapshot =
    aiProjection && aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY
      ? aiProjection.aiBlock
      : block;

  assertInlineContentRegistered(snapshot.content, registry);
  const children = Array.isArray(snapshot.children)
    ? snapshot.children
        .map((child) => projectBlock(child, registry, aiDiffDisplayMode, aiContentByBlockId))
        .filter((child): child is Record<string, unknown> => child !== null)
    : snapshot.children;
  return {
    ...snapshot,
    ...(snapshot.children !== undefined ? { children } : {}),
  };
}

/** 将 AI Diff 投影为实际导出的文档结构，不附加任何具体文件格式的降级规则。 */
export function projectNoteBlocksForExport(
  blocks: readonly unknown[],
  registry: NotePluginRegistry,
  aiDiffDisplayMode: AiDiffDisplayMode = AI_DIFF_DISPLAY_MODE.OLD_ONLY,
  aiContentByBlockId: ReadonlyMap<string, unknown> = new Map()
): unknown[] {
  return blocks
    .map((block) => projectBlock(block, registry, aiDiffDisplayMode, aiContentByBlockId))
    .filter((block): block is Record<string, unknown> => block !== null);
}
