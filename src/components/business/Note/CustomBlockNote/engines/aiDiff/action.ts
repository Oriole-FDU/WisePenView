import type * as Y from 'yjs';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { isRecord } from '@/utils/typeGuards';

import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type {
  NoteAiDiffAcceptedBlockUpdate,
  NoteAiDiffAction,
  NoteAiDiffActionTarget,
  NoteBlockAiDiff,
  NotePluginRegistry,
} from '../../registry/types';
import { isAiDiffContentEmpty, isAiDiffContentEqual, resolveNoteAiDiffBlock } from './contentState';
import {
  AI_DIFF_ACTION_ORIGIN,
  clearAiContentEntries,
  deleteBlockAiContent,
  hasBlockAiContent,
  readAllAiContent,
  readBlockAiContent,
  setBlockAiContent,
} from './store';

type ApplyAiDiffActionResult = 'applied' | 'missing' | 'unsupported';

export interface NoteAiDiffActionRequest {
  blockId: string;
  action: NoteAiDiffAction;
  target?: NoteAiDiffActionTarget;
}

function collectBlockIds(block: Record<string, unknown>): string[] {
  const ids = typeof block.id === 'string' ? [block.id] : [];
  if (!Array.isArray(block.children)) return ids;
  for (const child of block.children) {
    if (isRecord(child)) ids.push(...collectBlockIds(child));
  }
  return ids;
}

function removeBlockWithAiContent(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  block: Record<string, unknown>;
}): void {
  const { doc, editor, block } = params;
  clearAiContentEntries(doc, collectBlockIds(block));
  editor.removeBlocks([block as Parameters<CustomBlockNoteEditor['removeBlocks']>[0][number]]);
}

function updateBlock(
  editor: CustomBlockNoteEditor,
  block: Record<string, unknown>,
  update: NoteAiDiffAcceptedBlockUpdate
): Record<string, unknown> {
  const updated = editor.updateBlock(
    block as Parameters<CustomBlockNoteEditor['updateBlock']>[0],
    update as Parameters<CustomBlockNoteEditor['updateBlock']>[1]
  ) as unknown as Record<string, unknown>;
  if (!updated) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `AI Diff block 更新未生效：${String(block.id ?? '')}`,
    });
  }
  return updated;
}

function resolveAcceptedUpdate(
  block: Record<string, unknown>,
  aiContent: unknown,
  aiDiff: NoteBlockAiDiff,
  registry: NotePluginRegistry
): NoteAiDiffAcceptedBlockUpdate | null {
  if (aiDiff.acceptAiContent) {
    return aiDiff.acceptAiContent(block, aiContent, registry);
  }
  return { content: aiContent };
}

export function applyNoteAiDiffAction(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  blockId: string;
  action: NoteAiDiffAction;
  target?: NoteAiDiffActionTarget;
}): ApplyAiDiffActionResult {
  const { doc, editor, registry, blockId, action, target } = params;
  if (!hasBlockAiContent(doc, blockId)) return 'missing';

  const aiContent = readBlockAiContent(doc, blockId);
  const block = editor.getBlock(blockId) as unknown as Record<string, unknown> | undefined;
  if (!block || typeof block.type !== 'string') return 'missing';
  const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
  const projection = aiDiff ? resolveNoteAiDiffBlock(block, aiContent, aiDiff, registry) : null;
  if (!aiDiff || !projection) return 'unsupported';
  const acceptedUpdate =
    action === 'accept' && !target && !projection.aiContentEmpty
      ? resolveAcceptedUpdate(block, aiContent, aiDiff, registry)
      : null;
  if (action === 'accept' && !target && !projection.aiContentEmpty && !acceptedUpdate) {
    return 'unsupported';
  }

  const granularContent = target
    ? aiDiff.applyGranular?.(block, aiContent, action, target, registry)
    : undefined;
  if (target && (granularContent === null || granularContent === undefined)) {
    return 'unsupported';
  }

  doc.transact(() => {
    if (!target) {
      if (action === 'accept') {
        if (projection.aiContentEmpty) {
          removeBlockWithAiContent({ doc, editor, block });
        } else {
          updateBlock(editor, block, acceptedUpdate!);
          deleteBlockAiContent(doc, blockId);
        }
      } else if (projection.currentEmpty) {
        removeBlockWithAiContent({ doc, editor, block });
      } else {
        deleteBlockAiContent(doc, blockId);
      }
      return;
    }

    if (action === 'accept') {
      if (isAiDiffContentEqual(granularContent, aiContent)) {
        if (isAiDiffContentEmpty(granularContent)) {
          removeBlockWithAiContent({ doc, editor, block });
          return;
        }
        updateBlock(editor, block, { content: granularContent });
        deleteBlockAiContent(doc, blockId);
        return;
      }
      const updated = updateBlock(editor, block, { content: granularContent });
      if (!resolveNoteAiDiffBlock(updated, aiContent, aiDiff, registry)) {
        deleteBlockAiContent(doc, blockId);
      }
      return;
    }

    if (isAiDiffContentEqual(block.content, granularContent)) {
      if (isAiDiffContentEmpty(granularContent)) {
        removeBlockWithAiContent({ doc, editor, block });
      } else {
        deleteBlockAiContent(doc, blockId);
      }
      return;
    }
    setBlockAiContent(doc, blockId, granularContent);
  }, AI_DIFF_ACTION_ORIGIN);
  return 'applied';
}

export function applyAllNoteAiDiffActions(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  action: NoteAiDiffAction;
}): ReadonlyMap<string, ApplyAiDiffActionResult> {
  const { doc, editor, registry, action } = params;
  const blockIds = [...readAllAiContent(doc).keys()];
  const results = new Map<string, ApplyAiDiffActionResult>();
  doc.transact(() => {
    for (const blockId of blockIds) {
      results.set(blockId, applyNoteAiDiffAction({ doc, editor, registry, blockId, action }));
    }
  }, AI_DIFF_ACTION_ORIGIN);
  editor.focus();
  return results;
}
