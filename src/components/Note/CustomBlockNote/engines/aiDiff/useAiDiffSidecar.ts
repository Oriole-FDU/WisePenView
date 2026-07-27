import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';

import type { AiDiffDisplayMode } from '@/domains/Note';
import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NotePluginRegistry } from '../../registry/types';
import { applyNoteAiDiffAction, type NoteAiDiffActionRequest } from './action';
import { resolveNoteAiDiffBlock } from './contentState';
import { syncAiDiffExtensionState } from './extension';
import { getAiContentStore, observeAiContent, readAllAiContent } from './store';

function hasActiveAiDiff(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  aiContentByBlockId: ReturnType<typeof readAllAiContent>
): boolean {
  for (const [blockId, aiContent] of aiContentByBlockId) {
    const block = editor.getBlock(blockId) as unknown as Record<string, unknown> | undefined;
    if (!block || typeof block.type !== 'string') continue;
    const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
    if (aiDiff && resolveNoteAiDiffBlock(block, aiContent, aiDiff, registry)) {
      return true;
    }
  }
  return false;
}

export function useAiDiffSidecar(params: {
  doc: Y.Doc;
  noteFragment: Y.XmlFragment;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  displayMode: AiDiffDisplayMode;
  readOnly: boolean;
  undoManager: Y.UndoManager;
  onPresenceChange?: (present: boolean) => void;
}): boolean {
  const {
    doc,
    noteFragment,
    editor,
    registry,
    displayMode,
    readOnly,
    undoManager,
    onPresenceChange,
  } = params;
  const [present, setPresent] = useState(false);
  const lastPresenceRef = useRef(false);
  const queuedFrameRef = useRef<number | null>(null);
  const queuedExtensionSyncRef = useRef(false);
  const aiContentByBlockIdRef = useRef<ReadonlyMap<string, unknown>>(new Map());

  const applyAction = useMemoizedFn((request: NoteAiDiffActionRequest) => {
    undoManager.stopCapturing();
    applyNoteAiDiffAction({ doc, editor, registry, ...request });
    editor.focus();
    undoManager.stopCapturing();
  });

  const sync = useMemoizedFn((syncExtension: boolean) => {
    const aiContentByBlockId = aiContentByBlockIdRef.current;
    if (syncExtension) {
      syncAiDiffExtensionState(editor.prosemirrorView, {
        displayMode,
        aiContentByBlockId,
        actionsEnabled: !readOnly,
        onAction: applyAction,
      });
    }
    const nextPresence = hasActiveAiDiff(editor, registry, aiContentByBlockId);
    if (lastPresenceRef.current === nextPresence) return;
    lastPresenceRef.current = nextPresence;
    setPresent(nextPresence);
    onPresenceChange?.(nextPresence);
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：sidecar 或正文变化时，刷新本地只读投影与 presence。
   * 不可替代原因：sidecar 是独立 Y.Map，不会触发 BlockNote 的 onChange。
   * cleanup：移除 Yjs 监听并取消待执行帧，避免旧文档继续刷新编辑器。
   */
  useEffect(() => {
    const scheduleSync = (syncExtension: boolean) => {
      if (!syncExtension && aiContentByBlockIdRef.current.size === 0) return;
      queuedExtensionSyncRef.current ||= syncExtension;
      if (queuedFrameRef.current !== null) return;
      queuedFrameRef.current = window.requestAnimationFrame(() => {
        queuedFrameRef.current = null;
        const shouldSyncExtension = queuedExtensionSyncRef.current;
        queuedExtensionSyncRef.current = false;
        sync(shouldSyncExtension);
      });
    };
    const store = getAiContentStore(doc);
    aiContentByBlockIdRef.current = readAllAiContent(doc);
    const handleAiContentChange = (event: Y.YMapEvent<unknown>) => {
      const next = new Map(aiContentByBlockIdRef.current);
      event.keysChanged.forEach((key) => {
        const blockId = String(key);
        if (store.has(blockId)) {
          next.set(blockId, store.get(blockId));
        } else {
          next.delete(blockId);
        }
      });
      aiContentByBlockIdRef.current = next;
      scheduleSync(true);
    };
    const unobserveAiContent = observeAiContent(doc, handleAiContentChange);
    const observeBodyChange = () => scheduleSync(false);
    noteFragment.observeDeep(observeBodyChange);
    scheduleSync(true);
    return () => {
      unobserveAiContent();
      noteFragment.unobserveDeep(observeBodyChange);
      if (queuedFrameRef.current !== null) {
        window.cancelAnimationFrame(queuedFrameRef.current);
        queuedFrameRef.current = null;
      }
      queuedExtensionSyncRef.current = false;
    };
  }, [displayMode, doc, editor, noteFragment, readOnly, registry, sync]);

  return present;
}
