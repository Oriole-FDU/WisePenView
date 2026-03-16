/**
 * ConflictResolve - 版本冲突处理
 * 用快照创建副本、迁移 deltas，通过回调通知上层切换 resourceId/baseVersion 并继续 send。
 */

import type { JsonDelta } from '@/types/note';
import type { INoteService } from '@/services/Note';
import type { LocalNoteStorage } from './LocalNoteStorage';

export interface ConflictResolveCallbacks {
  getUnsentDeltas: () => JsonDelta[];
  prependPending: (deltas: JsonDelta[]) => void;
  setResourceId: (id: string) => void;
  setBaseVersion: (v: number) => void;
  send: () => void;
  enterOfflineMode: () => void;
  updateSaveStatus: () => void;
  /** 切换为新文档后调用，用于重置 snapshotSaved 等 */
  onConflictResolved?: () => void;
}

export interface ConflictResolveOptions {
  noteService: INoteService;
  localNoteStorage: LocalNoteStorage;
  onSyncFail?: (error: unknown) => void;
}

export class ConflictResolve {
  private readonly noteService: INoteService;
  private readonly localNoteStorage: LocalNoteStorage;
  private readonly onSyncFail?: (error: unknown) => void;

  constructor(options: ConflictResolveOptions) {
    this.noteService = options.noteService;
    this.localNoteStorage = options.localNoteStorage;
    this.onSyncFail = options.onSyncFail;
  }

  async handleVersionConflict(
    resourceId: string,
    failedDeltas: JsonDelta[],
    callbacks: ConflictResolveCallbacks
  ): Promise<void> {
    try {
      const snapshot = await this.localNoteStorage.readSnapshot(resourceId);
      if (!snapshot) {
        callbacks.enterOfflineMode();
        if (failedDeltas.length > 0) {
          this.localNoteStorage.writePending(resourceId, failedDeltas).catch(() => {
            callbacks.prependPending(failedDeltas);
          });
        }
        this.onSyncFail?.(new Error('Version conflict without snapshot'));
        return;
      }

      const originalTitle =
        snapshot.title && snapshot.title.trim().length > 0 ? snapshot.title : '未命名笔记';
      const copyTitle = `${originalTitle} - 副本`;

      const created = await this.noteService.createNote({
        initial_content: snapshot.blocks,
        title: copyTitle,
        source: snapshot.noteId,
      });

      const newResourceId = created.doc_id;
      const newBaseVersion = created.version;

      let offlineDeltas: JsonDelta[] = [];
      try {
        offlineDeltas = await this.localNoteStorage.readPending(resourceId);
      } catch {
        offlineDeltas = [];
      }
      await this.localNoteStorage.clearPending(resourceId).catch(() => {});
      await this.localNoteStorage.clearSnapshot(resourceId).catch(() => {});

      const inMemoryPending = callbacks.getUnsentDeltas();
      const allDeltas: JsonDelta[] = [...offlineDeltas, ...failedDeltas, ...inMemoryPending];

      callbacks.setResourceId(newResourceId);
      callbacks.setBaseVersion(newBaseVersion);
      callbacks.onConflictResolved?.();

      if (allDeltas.length > 0) {
        callbacks.prependPending(allDeltas);
        callbacks.send();
      } else {
        callbacks.updateSaveStatus();
      }
    } catch (e) {
      callbacks.enterOfflineMode();
      if (failedDeltas.length > 0) {
        this.localNoteStorage.writePending(resourceId, failedDeltas).catch(() => {
          callbacks.prependPending(failedDeltas);
        });
      }
      this.onSyncFail?.(e);
    }
  }
}
