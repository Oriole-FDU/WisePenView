import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';

import { captureInlineCommentDraft } from '../engines/inlineComments/relativePosition';
import type { CustomBlockNoteProps } from '../index.type';
import {
  useNoteAiDiff,
  useNoteCollaboration,
  useNoteDocument,
  useNoteEditorCommands,
  useNoteEditorHydration,
  useNoteEditorScroll,
  useNoteOutlineRuntime,
  type NoteEditorDefinition,
} from '../runtime';
import { notePluginRegistry, type CustomBlockNoteEditor } from './noteEditorComposition';

export function useNoteEditorRuntimeCoordinator({
  editor,
  definition,
  props,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  props: CustomBlockNoteProps;
}) {
  const { t } = useTranslation('note');
  const {
    resourceId,
    collaboration: collaborationBinding,
    state: { aiDiffDisplayMode, readOnly, blockLocalDocWrites },
    aiDiffPreview,
    onOutlineChange,
    onActiveHeadingChange,
    onAiDiffPresenceChange,
    onAskAi,
    onAiDiffBodyContentHashChange,
  } = props;
  const collaboration = useNoteCollaboration({
    editor,
    definition,
    collaboration: collaborationBinding,
    readOnly,
  });

  const aiDiff = useNoteAiDiff({
    editor,
    definition,
    doc: collaborationBinding.doc,
    undoManager: collaboration.undoManager,
    aiDiffDisplayMode,
    readOnly,
    blockLocalDocWrites,
    onPresenceChange: onAiDiffPresenceChange,
  });

  const outlineRuntime = useNoteOutlineRuntime({
    editor,
    registry: notePluginRegistry,
    onOutlineChange,
    onActiveItemChange: onActiveHeadingChange,
  });

  const document = useNoteDocument({
    editor,
    definition,
    transactions: notePluginRegistry.services.transactions,
    resourceId,
    blockLocalDocWrites,
    onAskAi,
    onAiDiffBodyContentHashChange,
  });

  useNoteEditorHydration({
    editor,
    doc: collaborationBinding.doc,
    undoManager: collaboration.undoManager,
    resourceId,
    collaborationReady: collaborationBinding.ready,
    aiDiffPreview,
    scheduleBodyContentHashRefresh: document.scheduleBodyContentHashRefresh,
  });

  const scroll = useNoteEditorScroll(editor);
  const commands = useNoteEditorCommands(
    editor,
    aiDiff.setExportDisplayModeOverride,
    scroll.scrollToTarget,
    !readOnly && !blockLocalDocWrites && collaborationBinding.ready
  );
  const editorHandle = { ...commands, scrollToAnchor: scroll.scrollToAnchor };
  const handleSelectionChange = useMemoizedFn(() => {
    document.captureSelection();
    outlineRuntime.syncActiveItem();
  });

  const handleCreateInlineComment = useMemoizedFn(() => {
    if (!props.inlineComments) return;
    const draft = captureInlineCommentDraft(editor, notePluginRegistry);
    if (!draft) {
      toast.info(t('comments.selectTextFirst'));
      return;
    }
    props.inlineComments.onCreateRequest(draft);
  });

  return {
    collaboration,
    document,
    aiDiff,
    scroll,
    commands,
    editorHandle,
    handleSelectionChange,
    inlineComments: {
      handleCreate: handleCreateInlineComment,
    },
  };
}

export type NoteEditorRuntimeCoordinator = ReturnType<typeof useNoteEditorRuntimeCoordinator>;
