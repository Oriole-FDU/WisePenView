import { getNearestBlockPos } from '@blocknote/core';
import { useLatest, useMemoizedFn } from 'ahooks';
import { useEffect, useRef } from 'react';

import {
  buildNoteOutlineProjection,
  projectNoteOutlineBlock,
  resolveActiveOutlineItemId,
  type NoteOutlineBlockSnapshot,
  type NoteOutlineItem,
} from '../engines/outline';
import type { CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NotePluginRegistry, NoteTransactionAnalysis } from '../registry/types';

const OUTLINE_INCREMENTAL_MAX_RANGES = 32;
const OUTLINE_INCREMENTAL_MAX_BLOCKS = 64;

function requiresOutlineFullRefresh(analysis: NoteTransactionAnalysis): boolean {
  return (
    analysis.changedRanges.length > OUTLINE_INCREMENTAL_MAX_RANGES ||
    analysis.changedBlocks.length + analysis.removedBlockIds.length > OUTLINE_INCREMENTAL_MAX_BLOCKS
  );
}

interface UseNoteOutlineRuntimeParams {
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveItemChange?: (activeId: string | undefined) => void;
}

export function useNoteOutlineRuntime({
  editor,
  registry,
  onOutlineChange,
  onActiveItemChange,
}: UseNoteOutlineRuntimeParams) {
  const transactions = registry.services.transactions;
  const callbacksLatest = useLatest({ onOutlineChange, onActiveItemChange });
  const blockSnapshotsRef = useRef<NoteOutlineBlockSnapshot[]>([]);
  const itemsByIdRef = useRef<Map<string, NoteOutlineItem>>(new Map());
  const emittedItemsRef = useRef<NoteOutlineItem[]>([]);
  const refreshFrameRef = useRef<number | null>(null);
  const selectionBlockIdRef = useRef<string | undefined>(undefined);
  const emittedActiveItemIdRef = useRef<string | undefined>(undefined);

  const syncActiveItem = useMemoizedFn((force = false) => {
    const onChange = callbacksLatest.current.onActiveItemChange;
    if (!onChange) return;
    let currentBlockId: string | undefined;
    try {
      const { doc, selection } = editor.prosemirrorState;
      const blockId = getNearestBlockPos(doc, selection.head).node.attrs.id;
      currentBlockId = typeof blockId === 'string' ? blockId : undefined;
    } catch {
      currentBlockId = undefined;
    }
    if (!force && selectionBlockIdRef.current === currentBlockId) return;
    selectionBlockIdRef.current = currentBlockId;
    const activeItemId = currentBlockId
      ? resolveActiveOutlineItemId(blockSnapshotsRef.current, currentBlockId)
      : undefined;
    if (emittedActiveItemIdRef.current === activeItemId) return;
    emittedActiveItemIdRef.current = activeItemId;
    onChange(activeItemId);
  });

  const emitItems = useMemoizedFn((items: readonly NoteOutlineItem[], force = false) => {
    const callbacks = callbacksLatest.current;
    if (!callbacks.onOutlineChange) return;
    const previous = emittedItemsRef.current;
    const changed =
      force ||
      previous.length !== items.length ||
      previous.some(
        (item, index) =>
          item.id !== items[index]?.id ||
          item.level !== items[index]?.level ||
          item.text !== items[index]?.text
      );
    if (!changed) return;
    const nextItems = [...items];
    emittedItemsRef.current = nextItems;
    callbacks.onOutlineChange(nextItems);
  });

  const refresh = useMemoizedFn((force = false) => {
    const callbacks = callbacksLatest.current;
    if (!callbacks.onOutlineChange && !callbacks.onActiveItemChange) return;
    const projection = buildNoteOutlineProjection(editor, registry);
    blockSnapshotsRef.current = projection.blocks;
    itemsByIdRef.current = new Map(projection.items.map((item) => [item.id, item]));
    emitItems(projection.items, force);
    syncActiveItem(true);
  });

  const scheduleFullRefresh = useMemoizedFn(() => {
    if (refreshFrameRef.current !== null) return;
    refreshFrameRef.current = window.requestAnimationFrame(() => {
      refreshFrameRef.current = null;
      refresh();
    });
  });

  const updateChangedBlocks = useMemoizedFn((changedBlockIds: readonly string[]) => {
    if (changedBlockIds.length === 0) return;
    const snapshots = [...blockSnapshotsRef.current];
    let itemsChanged = false;
    let outlineMembershipChanged = false;
    for (const blockId of changedBlockIds) {
      const block = editor.getBlock(blockId);
      const projection = projectNoteOutlineBlock(block, registry);
      if (!projection) continue;
      const snapshotIndex = snapshots.findIndex((snapshot) => snapshot.id === blockId);
      if (snapshotIndex >= 0) {
        outlineMembershipChanged ||=
          snapshots[snapshotIndex]?.contributesToOutline !==
          projection.snapshot.contributesToOutline;
        snapshots[snapshotIndex] = projection.snapshot;
      }
      const previousItem = itemsByIdRef.current.get(blockId);
      if (projection.item) {
        itemsByIdRef.current.set(blockId, projection.item);
        itemsChanged ||=
          !previousItem ||
          previousItem.level !== projection.item.level ||
          previousItem.text !== projection.item.text;
      } else if (previousItem) {
        itemsByIdRef.current.delete(blockId);
        itemsChanged = true;
      }
    }
    blockSnapshotsRef.current = snapshots;
    if (outlineMembershipChanged) syncActiveItem(true);
    if (!itemsChanged) return;
    const items = snapshots
      .map((snapshot) => itemsByIdRef.current.get(snapshot.id))
      .filter((item): item is NoteOutlineItem => Boolean(item));
    emitItems(items);
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：编辑器实例变化时订阅事务，并立即构建一次大纲投影。
   * 不可替代原因：Editor 是大纲的外部事件源，正文结构变化只能从事务流得知。
   * cleanup：注销旧编辑器事务监听，并取消尚未执行的全量刷新帧。
   */
  useEffect(() => {
    const cleanup = transactions.subscribe(editor, (analysis) => {
      if (!analysis.docChanged) return;
      if (requiresOutlineFullRefresh(analysis) || analysis.structureChanged) {
        scheduleFullRefresh();
        return;
      }
      updateChangedBlocks(analysis.changedBlocks.map(({ id }) => id));
    });
    refresh(true);
    return () => {
      cleanup();
      if (refreshFrameRef.current !== null) {
        window.cancelAnimationFrame(refreshFrameRef.current);
        refreshFrameRef.current = null;
      }
    };
  }, [editor, refresh, scheduleFullRefresh, transactions, updateChangedBlocks]);

  return { syncActiveItem };
}
