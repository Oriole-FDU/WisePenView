import { createExtension, type ExtensionFactoryInstance } from '@blocknote/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { ySyncPluginKey } from 'y-prosemirror';

function isYjsSyncTransaction(tr: Transaction): boolean {
  return tr.getMeta(ySyncPluginKey) !== undefined || tr.getMeta('y-sync$') !== undefined;
}

/** 无协同编辑权时拦截本地 ProseMirror 文档写入（Yjs 同步事务仍放行）。 */
export function createNoteReadOnlyFilterExtension(
  isBlockLocalDocWrites: () => boolean
): ExtensionFactoryInstance {
  return createExtension({
    key: 'noteReadOnlyFilter',
    prosemirrorPlugins: [
      new Plugin({
        key: new PluginKey('noteReadOnlyFilter'),
        filterTransaction(tr) {
          if (!isBlockLocalDocWrites() || !tr.docChanged) return true;
          if (isYjsSyncTransaction(tr)) return true;
          return false;
        },
      }),
    ],
  });
}
