import { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';

import { captureInlineCommentDraft } from '../engines/inlineComments/relativePosition';
import {
  useNoteAiDiff,
  useNoteCollaboration,
  useNoteDocument,
  useNoteEditorCommands,
  useNoteEditorDefinition,
  useNoteEditorHydration,
  useNoteEditorScroll,
  useNoteImageUploadEditorBinding,
  useNoteImageUploadRuntime,
  useNoteOutlineRuntime,
} from '../runtime';
import type { NoteEditorRuntimeProps } from '../runtime/runtime.type';
import { notePluginRegistry } from './noteEditorComposition';

export function useNoteEditorRuntimeCoordinator(props: NoteEditorRuntimeProps) {
  const { t } = useTranslation('note');
  const {
    resourceId,
    collaboration: collaborationBinding,
    state: { readOnly, blockLocalDocWrites },
    aiDiffPreview,
    onOutlineChange,
    onActiveHeadingChange,
    onAiDiffPresenceChange,
    onAskAi,
    onAiDiffBodyContentHashChange,
  } = props;
  const imageUploadRuntime = useNoteImageUploadRuntime({
    resourceId,
    readOnly,
    onPendingCountChange: props.onImageUploadCountChange,
  });
  const definition = useNoteEditorDefinition(props, {
    uploadFile: imageUploadRuntime.uploadFile,
  });
  const editor = useCreateBlockNote(definition.editorOptions);
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
    canWrite: !readOnly && !blockLocalDocWrites,
    aiDiffPreview,
    scheduleBodyContentHashRefresh: document.scheduleBodyContentHashRefresh,
  });

  useNoteImageUploadEditorBinding({
    editor,
    runtime: imageUploadRuntime,
  });

  const scroll = useNoteEditorScroll(editor);
  const commands = useNoteEditorCommands(
    editor,
    scroll.scrollToTarget,
    !readOnly && !blockLocalDocWrites && collaborationBinding.ready
  );
  const editorHandle = {
    exportMarkdown: commands.exportMarkdown,
    exportPdf: commands.exportPdf,
    focus: commands.focus,
    openFind: commands.openFind,
    scrollToAnchor: scroll.scrollToAnchor,
  };
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
    editor,
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
    find: commands.find,
  };
}

export type NoteEditorRuntimeCoordinator = ReturnType<typeof useNoteEditorRuntimeCoordinator>;
