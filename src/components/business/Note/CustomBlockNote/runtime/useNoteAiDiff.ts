import type * as Y from 'yjs';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';

import { useAiDiffSidecar } from '../engines/aiDiff/useAiDiffSidecar';
import type { CustomBlockNoteProps } from '../index.type';
import { type CustomBlockNoteEditor, notePluginRegistry } from '../registry/noteEditorComposition';
import { useNoteInteractionStore } from './noteInteractionStore';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

export function useNoteAiDiff({
  editor,
  definition,
  doc,
  undoManager,
  readOnly,
  blockLocalDocWrites,
  onPresenceChange,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  doc: CustomBlockNoteProps['collaboration']['doc'];
  undoManager: Y.UndoManager;
  readOnly: boolean;
  blockLocalDocWrites: boolean;
  onPresenceChange: CustomBlockNoteProps['onAiDiffPresenceChange'];
}) {
  const displayMode = useNoteInteractionStore((state) => state.review.displayMode);
  const dispatch = useNoteInteractionStore((state) => state.dispatch);
  const hasContent = useAiDiffSidecar({
    doc,
    noteFragment: definition.noteFragment,
    editor,
    registry: notePluginRegistry,
    displayMode,
    readOnly: readOnly || blockLocalDocWrites,
    undoManager,
    onPresenceChange: (present) => {
      dispatch({ type: 'REVIEW_CONTENT_CHANGED', hasContent: present });
      onPresenceChange?.(present);
    },
  });

  return {
    showBulkActions:
      hasContent &&
      !readOnly &&
      !blockLocalDocWrites &&
      displayMode === AI_DIFF_DISPLAY_MODE.COMPARE,
  };
}
