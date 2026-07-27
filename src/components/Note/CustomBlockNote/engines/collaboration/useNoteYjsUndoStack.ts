import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';
import { useMount, useUnmount } from 'ahooks';
import { useRef, useState } from 'react';
import * as Y from 'yjs';

/** 笔记正文在 Y.Doc 中的 XmlFragment 名；需与后端 observeDeep 及 BlockNote 绑定名一致 */
const NOTE_YJS_DOCUMENT_FRAGMENT = 'document-store' as const;

type PluginStateWithBinding = { binding?: unknown };
type ProsemirrorPluginLike = {
  key?: string;
  spec?: { key?: unknown };
  getState: (state: unknown) => unknown;
};

function resolveYjsTrackedOrigins<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {
  const { prosemirrorState } = editor;
  const trackedOrigins = new Set<unknown>();

  for (const plugin of prosemirrorState.plugins as readonly ProsemirrorPluginLike[]) {
    const pluginState = plugin.getState(prosemirrorState) as PluginStateWithBinding | undefined;
    if (pluginState?.binding) {
      trackedOrigins.add(pluginState.binding);
    }

    if (plugin.key?.startsWith('y-sync') && plugin.spec?.key) {
      trackedOrigins.add(plugin.spec.key);
    }
  }

  return trackedOrigins;
}

// 得到笔记正文在 Y.Doc 中的 XmlFragment 名
export function useNoteYjsFragment(doc: Y.Doc): Y.XmlFragment {
  const noteFragment = doc.getXmlFragment(NOTE_YJS_DOCUMENT_FRAGMENT);
  return noteFragment;
}

// 基于编辑器已注册的 Yjs 插件 origin 创建 UndoManager，确保首个本地事务也能入栈。
export function useNoteYjsUndoManager<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  noteFragment: Y.XmlFragment,
  aiContentStore: Y.Map<unknown>,
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  additionalTrackedOrigins: readonly unknown[] = []
): Y.UndoManager {
  const [undoManager] = useState(() => {
    const trackedOrigins = resolveYjsTrackedOrigins(editor);
    trackedOrigins.add(null);
    additionalTrackedOrigins.forEach((origin) => trackedOrigins.add(origin));
    return new Y.UndoManager([noteFragment, aiContentStore], {
      trackedOrigins,
      captureTimeout: 500,
    });
  });

  return undoManager;
}

/**
 * 将协同相关的 Yjs origin 纳入 UndoManager，并在运行期持续补充本地事务的 origin。
 * 需在 `useCreateBlockNote` 拿到 `editor` 之后调用。
 */
export function useAttachNoteYjsUndoStack<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(doc: Y.Doc, editor: BlockNoteEditor<BSchema, ISchema, SSchema>, undoManager: Y.UndoManager) {
  const afterTransactionListenerRef = useRef<((transaction: Y.Transaction) => void) | null>(null);

  useMount(() => {
    const trackedOrigins = resolveYjsTrackedOrigins(editor);
    for (const origin of trackedOrigins) {
      undoManager.trackedOrigins.add(origin);
    }

    const handleAfterTransaction = (transaction: Y.Transaction) => {
      if (!transaction.local) return;
      if (transaction.origin != null) {
        undoManager.trackedOrigins.add(transaction.origin);
      }
    };
    afterTransactionListenerRef.current = handleAfterTransaction;
    doc.on('afterTransaction', handleAfterTransaction);
  });

  useUnmount(() => {
    if (afterTransactionListenerRef.current) {
      doc.off('afterTransaction', afterTransactionListenerRef.current);
      afterTransactionListenerRef.current = null;
    }
    undoManager.destroy();
  });
}
