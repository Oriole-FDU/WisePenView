import type { Editor, EditorExitContext, EditorKind, EditorSnapshot } from '../editor.type';

/** 中止只取消退出意图，不取消领域保存；迟到的保存结果不能恢复旧导航。 */
export function abortableExit(task: Promise<boolean>, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const finish = (allowed: boolean) => {
      signal.removeEventListener('abort', cancel);
      resolve(allowed && !signal.aborted);
    };
    const cancel = () => finish(false);
    signal.addEventListener('abort', cancel, { once: true });
    void task.then(finish, () => finish(false));
  });
}

export function createEditorRuntime(instanceId: string, kind: EditorKind, initial: EditorSnapshot) {
  let snapshot = initial;
  let prepare: ((context: EditorExitContext) => Promise<boolean>) | undefined;
  const listeners = new Set<() => void>();
  const editor: Editor = {
    instanceId,
    kind,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    prepareExit(context) {
      if (context.signal.aborted) return Promise.resolve(false);
      const task = Promise.resolve().then(() =>
        prepare ? prepare(context) : !snapshot.hasUnsavedChanges && !snapshot.pendingWork
      );
      return abortableExit(task, context.signal);
    },
  };
  return {
    editor,
    update(patch: Partial<EditorSnapshot>) {
      const next = { ...snapshot, ...patch };
      if (JSON.stringify(next) === JSON.stringify(snapshot) && next.error === snapshot.error)
        return;
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
    setPrepareExit(handler: (context: EditorExitContext) => Promise<boolean>) {
      prepare = handler;
      return () => {
        if (prepare === handler) prepare = undefined;
      };
    },
  };
}

export function waitForEditor(
  editor: Editor,
  ready: (snapshot: EditorSnapshot) => boolean,
  signal: AbortSignal
): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  if (ready(editor.getSnapshot())) return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (allowed: boolean) => {
      unsubscribe();
      signal.removeEventListener('abort', cancel);
      resolve(allowed);
    };
    const cancel = () => finish(false);
    const unsubscribe = editor.subscribe(() => {
      if (ready(editor.getSnapshot())) finish(true);
    });
    signal.addEventListener('abort', cancel, { once: true });
  });
}
