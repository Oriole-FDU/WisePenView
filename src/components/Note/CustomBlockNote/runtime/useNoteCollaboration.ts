import { useEffect } from 'react';

import { AI_DIFF_ACTION_ORIGIN } from '../engines/aiDiff/store';
import { useNoteCaptureKeyEvent } from '../engines/collaboration/useNoteCaptureKeyEvent';
import {
  useAttachNoteYjsUndoStack,
  useNoteYjsUndoManager,
} from '../engines/collaboration/useNoteYjsUndoStack';
import type { CustomBlockNoteProps } from '../index.type';
import type { CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

type CollaborationUser = CustomBlockNoteProps['collaboration']['user'];
type YCursorExtensionHandle = {
  updateUser?: (user: CollaborationUser) => void;
};

const AI_DIFF_TRACKED_ORIGINS = [AI_DIFF_ACTION_ORIGIN] as const;

export function useNoteCollaboration({
  editor,
  definition,
  collaboration: { doc, provider, user: collaborationUser },
  readOnly,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  collaboration: CustomBlockNoteProps['collaboration'];
  readOnly: boolean;
}) {
  const { color: collaborationUserColor, name: collaborationUserName } = collaborationUser;
  const undoManager = useNoteYjsUndoManager(
    definition.noteFragment,
    definition.aiContentStore,
    editor,
    AI_DIFF_TRACKED_ORIGINS
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：协作者身份或编辑器实例变化时更新远端光标用户信息。
   * 不可替代原因：yCursor 是编辑器扩展维护的外部可变对象，只提供命令式 updateUser。
   * cleanup：没有订阅或异步任务，无需清理。
   */
  useEffect(() => {
    const yCursor = editor.getExtension('yCursor') as YCursorExtensionHandle | undefined;
    yCursor?.updateUser?.({ color: collaborationUserColor, name: collaborationUserName });
  }, [collaborationUserColor, collaborationUserName, editor]);

  useAttachNoteYjsUndoStack(doc, editor, undoManager);
  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  return {
    undoManager,
    onKeyDownCapture,
  };
}
