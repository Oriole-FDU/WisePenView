import type { Editor, EditorExitContext, EditorExitReason } from '../editor.type';
import { abortableExit } from './editorRuntime';

/** 每个宿主只拥有一个当前实例，注册清理按对象身份匹配。 */
export function createEditorHost() {
  let editor: Editor | null = null;
  let pending: { controller: AbortController; promise: Promise<boolean> } | undefined;
  const listeners = new Set<() => void>();
  const cancelExit = () => {
    pending?.controller.abort();
  };
  return {
    getSnapshot: () => editor,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    register(next: Editor) {
      cancelExit();
      editor = next;
      listeners.forEach((listener) => listener());
      return () => {
        if (editor !== next) return;
        cancelExit();
        editor = null;
        listeners.forEach((listener) => listener());
      };
    },
    cancelExit,
    requestExit(reason: EditorExitReason, confirm: EditorExitContext['confirm']) {
      if (pending && !pending.controller.signal.aborted) return pending.promise;
      const current = editor;
      if (!current) return Promise.resolve(true);
      const controller = new AbortController();
      const task = Promise.resolve().then(() =>
        current.prepareExit({ reason, signal: controller.signal, confirm })
      );
      const request = { controller, promise: Promise.resolve(false) };
      request.promise = abortableExit(task, controller.signal)
        .then((allowed) => allowed && editor === current)
        .finally(() => {
          if (pending === request) pending = undefined;
        });
      pending = request;
      return request.promise;
    },
  };
}
