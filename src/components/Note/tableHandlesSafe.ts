import type { CustomBlockNoteEditor } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { TableHandlesExtension } from '@blocknote/core/extensions';

type TableHandles = ReturnType<ReturnType<typeof TableHandlesExtension>>;

export function hasMountedEditorView(editor: CustomBlockNoteEditor) {
  try {
    return Boolean(editor.prosemirrorView?.dom?.isConnected);
  } catch {
    return false;
  }
}

export function getTableHandles(editor: CustomBlockNoteEditor): TableHandles | undefined {
  if (!hasMountedEditorView(editor)) {
    return undefined;
  }

  try {
    return editor.getExtension(TableHandlesExtension) as TableHandles | undefined;
  } catch {
    return undefined;
  }
}

export function getSafeTableCellSelection(editor: CustomBlockNoteEditor) {
  try {
    return getTableHandles(editor)?.getCellSelection();
  } catch {
    return undefined;
  }
}
