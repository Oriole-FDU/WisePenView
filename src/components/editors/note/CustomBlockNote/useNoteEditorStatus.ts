import { useNoteEditorSessionContext } from './session/_context';

/** 工作区只读取协同 UI 状态，不取得 Yjs、provider 或 DOM。 */
export function useNoteEditorStatus() {
  return useNoteEditorSessionContext().ui;
}
