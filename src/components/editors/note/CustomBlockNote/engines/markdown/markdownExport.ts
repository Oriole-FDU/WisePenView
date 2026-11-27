import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { isRecord } from '@/utils/type/typeGuards';

import type { NotePluginRegistry } from '../../registry/types';
import { readAiContentFromEditorState } from '../aiDiff/extension';
import { projectNoteBlocksForExport } from '../export/noteExportProjection';

function projectMarkdownInlineContent(
  content: unknown,
  registry: NotePluginRegistry,
  aiDiffDisplayMode: AiDiffDisplayMode
): { content: unknown; changed: boolean } {
  if (!Array.isArray(content)) return { content, changed: false };

  let changed = false;
  const projected: unknown[] = [];
  for (const inline of content) {
    if (!isRecord(inline)) {
      projected.push(inline);
      continue;
    }
    const type = typeof inline.type === 'string' ? inline.type : '';
    const owner = registry.inlinePlugins.get(type);
    if (!owner) {
      throw createError({
        code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
        source: 'client',
        meta: {
          reason: `Note inline type 缺少 owner：${type || 'unknown'}`,
        },
      });
    }
    const next = owner.markdownExport
      ? owner.markdownExport.project(inline, { aiDiffDisplayMode })
      : inline;
    if (next === null) {
      changed = true;
      continue;
    }
    if (next !== inline) changed = true;
    projected.push(next);
  }
  return { content: projected, changed };
}

function projectMarkdownBlock(
  block: unknown,
  registry: NotePluginRegistry,
  aiDiffDisplayMode: AiDiffDisplayMode
): Record<string, unknown> | null {
  if (!isRecord(block)) return null;
  const type = typeof block.type === 'string' ? block.type : '';
  const owner = registry.blockPlugins.get(type);
  if (!owner) {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
      source: 'client',
      meta: {
        reason: `Note block type 缺少 owner：${type || 'unknown'}`,
      },
    });
  }

  const inlineProjection = projectMarkdownInlineContent(block.content, registry, aiDiffDisplayMode);
  const children = Array.isArray(block.children)
    ? block.children
        .map((child) => projectMarkdownBlock(child, registry, aiDiffDisplayMode))
        .filter((child): child is Record<string, unknown> => child !== null)
    : block.children;
  const projected = {
    ...block,
    ...(block.content !== undefined ? { content: inlineProjection.content } : {}),
    ...(block.children !== undefined ? { children } : {}),
  };
  const ownedProjection = owner.markdownExport
    ? owner.markdownExport.project(projected, { aiDiffDisplayMode })
    : projected;
  if (ownedProjection === null) return null;

  const originalContent = Array.isArray(block.content) ? block.content : null;
  const projectedContent = Array.isArray(ownedProjection.content) ? ownedProjection.content : null;
  if (
    inlineProjection.changed &&
    originalContent?.length &&
    projectedContent?.length === 0 &&
    (!Array.isArray(children) || children.length === 0)
  ) {
    return null;
  }
  return ownedProjection;
}

export function projectNoteBlocksForMarkdown(
  blocks: readonly unknown[],
  registry: NotePluginRegistry,
  aiDiffDisplayMode: AiDiffDisplayMode = AI_DIFF_DISPLAY_MODE.OLD_ONLY,
  aiContentByBlockId: ReadonlyMap<string, unknown> = new Map()
): unknown[] {
  const exported = projectNoteBlocksForExport(
    blocks,
    registry,
    aiDiffDisplayMode,
    aiContentByBlockId
  );
  return exported
    .map((block) => projectMarkdownBlock(block, registry, aiDiffDisplayMode))
    .filter((block): block is Record<string, unknown> => block !== null);
}

export function exportNoteMarkdown<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  registry: NotePluginRegistry,
  blocks: readonly unknown[] = editor.document,
  aiDiffDisplayMode: AiDiffDisplayMode = AI_DIFF_DISPLAY_MODE.OLD_ONLY
): string {
  const aiContentByBlockId = readAiContentFromEditorState(editor.prosemirrorState);
  const projected = projectNoteBlocksForMarkdown(
    blocks,
    registry,
    aiDiffDisplayMode,
    aiContentByBlockId
  );
  const sections: string[] = [];
  let defaultBlocks: unknown[] = [];

  const flushDefaultBlocks = () => {
    if (defaultBlocks.length === 0) return;
    sections.push(editor.blocksToMarkdownLossy(defaultBlocks as typeof editor.document).trim());
    defaultBlocks = [];
  };

  for (const block of projected) {
    if (!isRecord(block)) continue;
    const type = typeof block.type === 'string' ? block.type : '';
    const renderer = registry.blockPlugins.get(type)?.markdownExport?.renderMarkdown;
    const hasChildren = Array.isArray(block.children) && block.children.length > 0;
    if (!renderer || hasChildren) {
      defaultBlocks.push(block);
      continue;
    }
    flushDefaultBlocks();
    sections.push(renderer(block, { aiDiffDisplayMode }).trim());
  }
  flushDefaultBlocks();
  return sections.filter(Boolean).join('\n\n');
}

export function exportNoteFullHtml<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  registry: NotePluginRegistry,
  blocks: readonly unknown[],
  aiDiffDisplayMode: AiDiffDisplayMode = AI_DIFF_DISPLAY_MODE.OLD_ONLY
): string {
  const aiContentByBlockId = readAiContentFromEditorState(editor.prosemirrorState);
  const projected = projectNoteBlocksForMarkdown(
    blocks,
    registry,
    aiDiffDisplayMode,
    aiContentByBlockId
  );
  return editor.blocksToFullHTML(projected as typeof editor.document);
}
