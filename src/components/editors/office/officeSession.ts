import type { Config, DocumentStateChangeEvent } from '@onlyoffice/doceditor-types';

import { waitForEditor } from '../_runtime/editorRuntime';
import type { Editor, EditorExitContext } from '../editor.type';

export function isOfficeReadOnly(config: Config | null | undefined) {
  return (
    !config || config.editorConfig?.mode === 'view' || config.document?.permissions?.edit === false
  );
}

/** SDK 的 false 只确认修改已送达编辑服务，不代表业务存储回写完成。 */
export async function prepareOfficeExit(editor: Editor, context: EditorExitContext) {
  if (!editor.getSnapshot().hasUnsavedChanges) return true;
  if (editor.getSnapshot().error) return false;
  const completed = await waitForEditor(
    editor,
    (snapshot) => !snapshot.hasUnsavedChanges || Boolean(snapshot.error),
    context.signal
  );
  const snapshot = editor.getSnapshot();
  return completed && !snapshot.error && !snapshot.hasUnsavedChanges;
}

export interface OfficeSessionState {
  ready: boolean;
  modified: boolean;
  error?: unknown;
}
export type OfficeSessionEvent =
  | { type: 'ready' }
  | { type: 'modified'; event: DocumentStateChangeEvent }
  | { type: 'error'; error: unknown };

/** 未携带布尔状态的 SDK 事件不能抹掉尚未同步的修改。 */
export function reduceOfficeSession(
  state: OfficeSessionState,
  event: OfficeSessionEvent
): OfficeSessionState {
  if (event.type === 'ready') return { ...state, ready: true, error: undefined };
  if (event.type === 'error') return { ...state, error: event.error };
  return typeof event.event.data === 'boolean' ? { ...state, modified: event.event.data } : state;
}
