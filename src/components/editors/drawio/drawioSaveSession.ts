import type { DrawioSaveState } from './drawioProtocol';

export interface DrawioSaveSnapshot {
  version: number;
  saveState: DrawioSaveState;
  error?: unknown;
}
interface DrawioSaveSessionOptions {
  initialXml: string;
  initialVersion: number;
  exportXml(): void;
  persistXml(xml: string, version: number): Promise<void>;
  createFailure(): unknown;
}

/** 导出与保存属于同一次任务；保存期间的新修改不能被旧响应标记为已保存。 */
export function createDrawioSaveSession(options: DrawioSaveSessionOptions) {
  let snapshot: DrawioSaveSnapshot = { version: options.initialVersion, saveState: 'saved' };
  let latestXml = options.initialXml;
  let savedXml = options.initialXml;
  let revision = 0;
  let disposed = false;
  let pending:
    | {
        promise: Promise<void>;
        resolve(): void;
        reject(error: unknown): void;
        exportRevision: number;
        exporting: boolean;
        timer?: ReturnType<typeof setTimeout>;
      }
    | undefined;
  const listeners = new Set<() => void>();
  const publish = (saveState: DrawioSaveState, error?: unknown) => {
    if (disposed) return;
    snapshot = { ...snapshot, saveState, error };
    listeners.forEach((listener) => listener());
  };
  const fail = (error: unknown) => {
    const task = pending;
    if (!task) return;
    clearTimeout(task.timer);
    pending = undefined;
    publish('failed', error);
    task.reject(error);
  };
  const begin = () => {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((success, failure) => {
      resolve = success;
      reject = failure;
    });
    const task = {
      promise,
      resolve,
      reject,
      exportRevision: revision,
      exporting: false,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
    };
    pending = task;
    publish('saving');
    return task;
  };
  const persist = async (xml: string, capturedRevision: number) => {
    const task = pending;
    if (!task) return;
    task.exporting = false;
    clearTimeout(task.timer);
    const version = snapshot.version + 1;
    try {
      await options.persistXml(xml, version);
      if (pending !== task || disposed) return;
      savedXml = xml;
      snapshot = { ...snapshot, version };
      pending = undefined;
      publish(revision === capturedRevision && latestXml === xml ? 'saved' : 'dirty');
      task.resolve();
    } catch (error) {
      if (pending === task) fail(error);
    }
  };
  const observeXml = (xml: string) => {
    if (disposed || latestXml === xml) return;
    latestXml = xml;
    revision += 1;
    if (!pending) publish(xml === savedXml ? 'saved' : 'dirty');
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    observeXml,
    requestSave() {
      if (disposed) return Promise.reject(options.createFailure());
      if (pending) return pending.promise;
      if (snapshot.saveState === 'saved') return Promise.resolve();
      const task = begin();
      task.exporting = true;
      task.timer = setTimeout(() => fail(options.createFailure()), 10_000);
      try {
        options.exportXml();
      } catch (error) {
        fail(error);
      }
      return task.promise;
    },
    receiveExport(xml?: string) {
      if (!pending?.exporting) return;
      if (xml === undefined) {
        fail(options.createFailure());
        return;
      }
      const capturedRevision = latestXml === xml ? revision : pending.exportRevision;
      if (revision === pending.exportRevision) latestXml = xml;
      void persist(xml, capturedRevision);
    },
    saveXml(xml: string) {
      observeXml(xml);
      if (pending) return pending.promise;
      const task = begin();
      void persist(xml, revision);
      return task.promise;
    },
    fail,
    activate() {
      disposed = false;
      publish(latestXml === savedXml ? 'saved' : 'dirty');
    },
    dispose() {
      disposed = true;
      fail(options.createFailure());
      listeners.clear();
    },
  };
}
