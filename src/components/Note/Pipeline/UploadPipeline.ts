/**
 * UploadPipeline - 笔记编辑变更的上传流水线
 *
 * 职责：将本地变更统一编排进 PendingQueue / OnFlightList，按网络状态决定发送或落库。
 *
 * 设计原则：
 * - refresh() 仅缓存变更（update → UpdateBuffer），不直接推送
 * - 防抖由 debounceTimer 触发，可能与 refresh 并发；入队时 updateBuffer flush 先于结构变更
 *
 * 数据流：
 * - 结构变更（insert/delete/move）→ 直接入 pendingQueue
 * - 内容变更（update）→ UpdateBuffer 防抖后由计时器 flush 入 pendingQueue
 *
 * 网络状态：
 * - online：正常发请求
 * - offline：send 写入 IndexedDB，指数退避重试恢复连接
 *
 * 依赖模块：SyncCore、ConnectionStateController、LocalNoteStorage、ConflictResolve、StatusNotification
 */

import type { JsonDelta, Block, NoteChange } from '@/types/note';
import type { INoteService } from '@/services/Note';
import { SyncCore } from './SyncCore';
import { ConnectionStateController } from './ConnectionState';
import type { ConnectionState } from './ConnectionState';
import { LocalNoteStorage } from './LocalNoteStorage';
import { ConflictResolve } from './ConflictResolve';
import { StatusNotification } from './StatusNotification';
import type { SaveStatus } from './StatusNotification';

const Config = {
  debounceMs: 500,
  idleSendMs: 10000,
  pendingQueueLimit: 100,
  retryBaseMs: 1000,
  retryMaxMs: 60000,
};

export type { ConnectionState };
export type { SaveStatus };

export interface UploadPipelineOptions {
  noteService: INoteService;
  resourceId: string;
  initialVersion: number;
  getSnapshot?: () => Promise<{ blocks: Block[]; title?: string }>;
  onSyncFail?: (error: unknown) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export class UploadPipeline {
  private readonly localNoteStorage = new LocalNoteStorage();
  private readonly statusNotification: StatusNotification;
  private readonly connectionState: ConnectionStateController;
  private readonly syncCore: SyncCore;
  private readonly conflictResolve: ConflictResolve;
  private readonly getSnapshot?: () => Promise<{ blocks: Block[]; title?: string }>;
  private readonly onSyncFail?: (error: unknown) => void;
  private snapshotSaved = false;

  constructor(options: UploadPipelineOptions) {
    this.getSnapshot = options.getSnapshot;
    this.onSyncFail = options.onSyncFail;

    this.statusNotification = new StatusNotification({
      onSaveStatusChange: options.onSaveStatusChange,
    });

    this.connectionState = new ConnectionStateController({
      retryBaseMs: Config.retryBaseMs,
      retryMaxMs: Config.retryMaxMs,
      onConnectionStateChange: options.onConnectionStateChange,
      onEnterOffline: () => {
        this.statusNotification.updateSaveStatus(
          this.connectionState.getConnectionState(),
          this.syncCore.hasDirty(),
          this.syncCore.hasPending()
        );
        this.ensureSnapshotSaved();
        this.connectionState.scheduleRetry();
      },
      onEnterOnline: () => {
        this.statusNotification.updateSaveStatus(
          this.connectionState.getConnectionState(),
          this.syncCore.hasDirty(),
          this.syncCore.hasPending()
        );
        if (this.syncCore.hasPending()) {
          this.syncCore.send();
        }
      },
      attemptReconnect: () => {
        void this.attemptReconnect();
      },
    });

    this.syncCore = new SyncCore({
      noteService: options.noteService,
      resourceId: options.resourceId,
      initialVersion: options.initialVersion,
      debounceMs: Config.debounceMs,
      idleSendMs: Config.idleSendMs,
      pendingQueueLimit: Config.pendingQueueLimit,
      isOffline: () => this.connectionState.isOffline(),
      onOfflineSend: (deltas) => {
        const resourceId = this.syncCore.getResourceId();
        this.localNoteStorage.writePending(resourceId, deltas).catch(() => {
          this.syncCore.prependPending(deltas);
        });
      },
      onSendFail: (deltas, error) => this.handleSendFail(deltas, error),
      onSaveStatusTick: () => {
        this.statusNotification.updateSaveStatus(
          this.connectionState.getConnectionState(),
          this.syncCore.hasDirty(),
          this.syncCore.hasPending()
        );
      },
    });

    this.syncCore.setOnEnqueue(() => this.statusNotification.showSaving(true));
    this.syncCore.setEnterOnlineFromSendDeltas(() => this.connectionState.enterOnlineMode());

    this.statusNotification.setTickCallback(() => {
      this.statusNotification.updateSaveStatus(
        this.connectionState.getConnectionState(),
        this.syncCore.hasDirty(),
        this.syncCore.hasPending()
      );
    });

    this.conflictResolve = new ConflictResolve({
      noteService: options.noteService,
      localNoteStorage: this.localNoteStorage,
      onSyncFail: this.onSyncFail,
    });

    this.syncOnInit();
    this.connectionState.registerWindowListeners();
  }

  refresh(changes: NoteChange[]): void {
    this.syncCore.refresh(changes);
  }

  getSaveStatus(): SaveStatus {
    return this.statusNotification.getSaveStatus();
  }

  getConnectionState(): ConnectionState {
    return this.connectionState.getConnectionState();
  }

  isOffline(): boolean {
    return this.connectionState.isOffline();
  }

  getBaseVersion(): number {
    return this.syncCore.getBaseVersion();
  }

  hasDirty(): boolean {
    return this.syncCore.hasDirty();
  }

  hasPending(): boolean {
    return this.syncCore.hasPending();
  }

  getPendingCount(): number {
    return this.syncCore.getPendingCount();
  }

  dispose(): void {
    this.syncCore.disposeTimers();
    this.connectionState.dispose();
    this.statusNotification.dispose();
    const resourceId = this.syncCore.getResourceId();
    const allDeltas = this.syncCore.getAllUnsentDeltas();
    if (allDeltas.length > 0) {
      this.localNoteStorage.writePending(resourceId, allDeltas).catch(() => {});
    }
  }

  private async syncOnInit(): Promise<void> {
    try {
      const resourceId = this.syncCore.getResourceId();
      const offlineDeltas = await this.localNoteStorage.readPending(resourceId);
      if (offlineDeltas.length > 0) {
        this.syncCore.prependPending(offlineDeltas);
        await this.localNoteStorage.clearPending(resourceId);
        this.syncCore.send();
      }
    } catch {
      // ignore
    }
  }

  private async ensureSnapshotSaved(): Promise<void> {
    if (this.snapshotSaved || !this.getSnapshot) return;
    try {
      const snapshot = await this.getSnapshot();
      const resourceId = this.syncCore.getResourceId();
      await this.localNoteStorage.writeSnapshot(resourceId, {
        version: this.syncCore.getBaseVersion(),
        blocks: snapshot.blocks,
        title: snapshot.title,
      });
      this.snapshotSaved = true;
    } catch {
      // ignore
    }
  }

  private handleSendFail(deltas: JsonDelta[], error: unknown): void {
    if (this.isVersionConflictError(error)) {
      const resourceId = this.syncCore.getResourceId();
      void this.conflictResolve.handleVersionConflict(resourceId, deltas, {
        getUnsentDeltas: () => this.syncCore.getAllUnsentDeltas(),
        prependPending: (d) => this.syncCore.prependPending(d),
        setResourceId: (id) => this.syncCore.setResourceId(id),
        setBaseVersion: (v) => this.syncCore.setBaseVersion(v),
        send: () => this.syncCore.send(),
        enterOfflineMode: () => this.connectionState.enterOfflineMode(),
        updateSaveStatus: () =>
          this.statusNotification.updateSaveStatus(
            this.connectionState.getConnectionState(),
            this.syncCore.hasDirty(),
            this.syncCore.hasPending()
          ),
        onConflictResolved: () => {
          this.snapshotSaved = false;
        },
      });
      return;
    }

    const resourceId = this.syncCore.getResourceId();
    this.localNoteStorage.writePending(resourceId, deltas).catch(() => {
      this.syncCore.prependPending(deltas);
    });

    if (this.connectionState.isOffline()) {
      this.connectionState.setBackoffMs(this.connectionState.getCurrentRetryMs() * 2);
      this.connectionState.scheduleRetry();
    } else {
      this.connectionState.enterOfflineMode();
    }
    this.onSyncFail?.(error);
  }

  private async attemptReconnect(): Promise<void> {
    const resourceId = this.syncCore.getResourceId();
    let deltas: JsonDelta[] = [];
    try {
      deltas = await this.localNoteStorage.readPending(resourceId);
    } catch {
      this.connectionState.scheduleRetry();
      return;
    }

    if (deltas.length === 0) {
      this.connectionState.enterOnlineMode();
      return;
    }

    try {
      await this.localNoteStorage.clearPending(resourceId);
    } catch {
      this.connectionState.scheduleRetry();
      return;
    }

    this.syncCore.sendDeltas(deltas);
  }

  private isVersionConflictError(error: unknown): boolean {
    const err = error as { response?: { status?: number } };
    return !!err?.response && err.response.status === 409;
  }
}
