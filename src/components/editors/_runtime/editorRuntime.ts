import type { Editor, EditorExitContext, EditorKind, EditorSnapshot } from '../editor.type';

export type EditorLoadState = Pick<EditorSnapshot, 'loading' | 'error'>;
type PrepareExit = (context: EditorExitContext) => Promise<boolean>;
export interface EditorSessionRegistration {
  update(snapshot: EditorSnapshot): void;
  dispose(): void;
}

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

function sameSnapshot(a: EditorSnapshot, b: EditorSnapshot) {
  const resource = a.openedResource;
  const nextResource = b.openedResource;
  return (
    resource.resourceId === nextResource.resourceId &&
    resource.resourceType === nextResource.resourceType &&
    resource.viewer === nextResource.viewer &&
    resource.resourceName === nextResource.resourceName &&
    resource.version === nextResource.version &&
    a.activeFile?.id === b.activeFile?.id &&
    a.activeFile?.path === b.activeFile?.path &&
    a.loading === b.loading &&
    a.error === b.error &&
    a.readOnly === b.readOnly &&
    a.hasUnsavedChanges === b.hasUnsavedChanges &&
    a.pendingWork === b.pendingWork &&
    a.warnBeforeUnload === b.warnBeforeUnload
  );
}

/** 加载信息属于入口；完整快照与退出策略一起归属当前领域会话。 */
export function createEditorRuntime(instanceId: string, kind: EditorKind, initial: EditorSnapshot) {
  let load: EditorLoadState = { loading: initial.loading, error: initial.error };
  let snapshot = initial;
  let session:
    { snapshot: EditorSnapshot; prepare?: PrepareExit; controller: AbortController } | undefined;
  const listeners = new Set<() => void>();
  const publish = () => {
    const next = session?.snapshot ?? {
      ...initial,
      ...load,
      activeFile: undefined,
      hasUnsavedChanges: false,
      pendingWork: false,
      warnBeforeUnload: false,
    };
    if (sameSnapshot(snapshot, next)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
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
      const current = session;
      if (!current) return Promise.resolve(true);
      const signal = AbortSignal.any([context.signal, current.controller.signal]);
      const task = Promise.resolve().then(() => {
        if (signal.aborted) return false;
        return current.prepare
          ? current.prepare({ ...context, signal })
          : !current.snapshot.hasUnsavedChanges && !current.snapshot.pendingWork;
      });
      return abortableExit(task, signal).then((allowed) => allowed && session === current);
    },
  };
  return {
    editor,
    updateLoad(next: EditorLoadState) {
      load = next;
      publish();
    },
    registerSession(next: EditorSnapshot, prepare?: PrepareExit): EditorSessionRegistration {
      session?.controller.abort();
      const current = { snapshot: next, prepare, controller: new AbortController() };
      session = current;
      publish();
      return {
        update(nextSnapshot) {
          if (session !== current) return;
          current.snapshot = nextSnapshot;
          publish();
        },
        dispose() {
          if (session !== current) return;
          current.controller.abort();
          session = undefined;
          publish();
        },
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
