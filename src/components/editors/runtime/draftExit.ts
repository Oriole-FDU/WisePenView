import type { Editor, EditorExitContext, EditorExitPrompt } from '../editor.type';
import { waitForEditor } from './editorRuntime';

/** 保存中的任务先结束；保存失败或期间产生的新修改都不能放行。 */
export async function prepareDraftExit(
  editor: Editor,
  context: EditorExitContext,
  prompt: EditorExitPrompt,
  actions: { save(): Promise<void>; discard(): Promise<void> }
) {
  if (!(await waitForEditor(editor, (snapshot) => !snapshot.pendingWork, context.signal)))
    return false;
  if (!editor.getSnapshot().hasUnsavedChanges) return true;
  const choice = await context.confirm(prompt);
  if (context.signal.aborted || choice === 'cancel') return false;
  if (choice === 'discard') {
    await actions.discard();
    return !context.signal.aborted;
  }
  await actions.save();
  const snapshot = editor.getSnapshot();
  return !context.signal.aborted && !snapshot.hasUnsavedChanges && !snapshot.pendingWork;
}
