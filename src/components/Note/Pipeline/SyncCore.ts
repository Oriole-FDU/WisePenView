/**
 * SyncCore - 同步核心
 * 只做变更缓冲 → 入队 → 发送 → 成功更新版本；不感知 IDB、重试、409。
 * buffer、pending、onflight 为 private 成员。
 */

import type { DeltaOp, NoteChange, JsonDelta, SyncPayload } from '@/types/note';
import type { INoteService } from '@/services/Note';
import { UpdateBuffer } from './UpdateBuffer';
import { PendingQueue } from './PendingQueue';
import { OnFlightList } from './OnFlightList';

export interface SyncCoreOptions {
  noteService: INoteService;
  resourceId: string;
  initialVersion: number;
  debounceMs: number;
  idleSendMs: number;
  pendingQueueLimit: number;
  isOffline: () => boolean;
  onOfflineSend: (deltas: JsonDelta[]) => void;
  onSendFail: (deltas: JsonDelta[], error: unknown) => void;
  onSaveStatusTick: () => void;
}

export class SyncCore {
  private seqCounter = 0;
  private readonly updateBuffer = new UpdateBuffer();
  private readonly pendingQueue = new PendingQueue();
  private readonly onFlightList = new OnFlightList();

  private readonly noteService: INoteService;
  private resourceId: string;
  private baseVersion: number;
  private readonly debounceMs: number;
  private readonly idleSendMs: number;
  private readonly pendingQueueLimit: number;
  private readonly isOffline: () => boolean;
  private readonly onOfflineSend: (deltas: JsonDelta[]) => void;
  private readonly onSendFail: (deltas: JsonDelta[], error: unknown) => void;
  private readonly onSaveStatusTick: () => void;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private idleSendTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SyncCoreOptions) {
    this.noteService = options.noteService;
    this.resourceId = options.resourceId;
    this.baseVersion = options.initialVersion;
    this.debounceMs = options.debounceMs;
    this.idleSendMs = options.idleSendMs;
    this.pendingQueueLimit = options.pendingQueueLimit;
    this.isOffline = options.isOffline;
    this.onOfflineSend = options.onOfflineSend;
    this.onSendFail = options.onSendFail;
    this.onSaveStatusTick = options.onSaveStatusTick;
  }

  getResourceId(): string {
    return this.resourceId;
  }

  getBaseVersion(): number {
    return this.baseVersion;
  }

  setResourceId(id: string): void {
    this.resourceId = id;
  }

  setBaseVersion(v: number): void {
    this.baseVersion = v;
  }

  hasDirty(): boolean {
    return this.updateBuffer.hasDirty();
  }

  hasPending(): boolean {
    return !this.pendingQueue.isEmpty() || !this.onFlightList.isEmpty();
  }

  getPendingCount(): number {
    return this.pendingQueue.size() + this.onFlightList.size();
  }

  isSenderBusy(): boolean {
    return !this.onFlightList.isEmpty();
  }

  prependPending(deltas: JsonDelta[]): void {
    this.pendingQueue.prepend(deltas);
  }

  refresh(changes: NoteChange[]): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.triggerIdleSendTimer();

    const structureChanges = changes.filter(
      (c) => c.type === 'insert' || c.type === 'delete' || c.type === 'move'
    );
    const updateChanges = changes.filter((c) => c.type === 'update');

    for (const c of updateChanges) {
      this.updateBuffer.set(c.block.id, c.block);
    }

    if (structureChanges.length > 0) {
      this.enqueueUpdateBuffer();
      this.enqueueStructureChange(structureChanges);
    }

    if (updateChanges.length > 0 && structureChanges.length === 0) {
      this.triggerDebounceFlushTimer();
    }
  }

  /** 供 Pipeline 在在线恢复后继续发送 */
  send(): void {
    if (this.isSenderBusy()) return;
    const deltas = this.pendingQueue.flush();
    if (deltas.length === 0) return;

    if (this.isOffline()) {
      this.onOfflineSend(deltas);
      return;
    }

    this.onFlightList.add(deltas);
    const payload: SyncPayload = {
      base_version: this.baseVersion,
      send_timestamp: Date.now(),
      deltas,
    };
    this.noteService
      .syncNote(this.resourceId, payload)
      .then((res) => this.confirmSendSuccess(res.new_version))
      .catch((error: unknown) => {
        const failed = this.onFlightList.getAll();
        this.onFlightList.removeAll();
        this.onSendFail(failed, error);
      });
  }

  /**
   * 重试链路：将指定 deltas 放入 onFlight 并发送一次
   */
  sendDeltas(deltas: JsonDelta[]): void {
    if (deltas.length === 0) return;
    this.onFlightList.add(deltas);
    const payload: SyncPayload = {
      base_version: this.baseVersion,
      send_timestamp: Date.now(),
      deltas,
    };
    this.noteService
      .syncNote(this.resourceId, payload)
      .then((res) => {
        this.onFlightList.removeAll();
        this.baseVersion = res.new_version;
        this.onSaveStatusTick();
        this.onEnterOnlineFromSendDeltas?.();
      })
      .catch((error: unknown) => {
        const failed = this.onFlightList.getAll();
        this.onFlightList.removeAll();
        this.onSendFail(failed, error);
      });
  }

  /** sendDeltas 成功时由 Pipeline 注入，用于 enterOnlineMode 后继续 send */
  setEnterOnlineFromSendDeltas(cb: () => void): void {
    this.onEnterOnlineFromSendDeltas = cb;
  }
  private onEnterOnlineFromSendDeltas: (() => void) | null = null;

  private confirmSendSuccess(newVersion: number): void {
    this.onFlightList.removeAll();
    this.baseVersion = newVersion;
    this.onSaveStatusTick();
    if (!this.pendingQueue.isEmpty()) {
      this.send();
    }
  }

  /** 取出所有未发送的 deltas（用于 dispose 写 LocalNoteStorage 或冲突迁移） */
  getAllUnsentDeltas(): JsonDelta[] {
    const all: JsonDelta[] = [];
    const entries = this.updateBuffer.flushSortedByTimestamp();
    for (const e of entries) {
      all.push({
        op: 'update' as const,
        blockId: e.blockId,
        data: e.data,
        timestamp: e.timestamp,
        seqId: ++this.seqCounter,
      });
    }
    all.push(...this.pendingQueue.flush());
    all.push(...this.onFlightList.getAll());
    this.onFlightList.removeAll();
    return all;
  }

  private triggerDebounceFlushTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.enqueueUpdateBuffer();
    }, this.debounceMs);
  }

  private triggerIdleSendTimer(): void {
    if (this.idleSendTimer) {
      clearTimeout(this.idleSendTimer);
      this.idleSendTimer = null;
    }
    this.idleSendTimer = setTimeout(() => {
      this.idleSendTimer = null;
      this.enqueueUpdateBuffer();
      this.send();
    }, this.idleSendMs);
  }

  private checkOverflowAndSend(): void {
    if (this.pendingQueue.size() > this.pendingQueueLimit) {
      this.send();
    }
  }

  private enqueueStructureChange(structureChanges: NoteChange[]): void {
    if (structureChanges.length === 0) return;
    const deltas: JsonDelta[] = structureChanges.map((c) => ({
      op: c.type as DeltaOp,
      blockId: c.block.id,
      data: c.type !== 'delete' ? c.block : undefined,
      timestamp: Date.now(),
      seqId: ++this.seqCounter,
    }));
    this.pendingQueue.enqueue(deltas);
    this.onEnqueue?.();
    this.checkOverflowAndSend();
  }

  private enqueueUpdateBuffer(): void {
    const entries = this.updateBuffer.flushSortedByTimestamp();
    if (entries.length === 0) return;
    const deltas: JsonDelta[] = entries.map((e) => ({
      op: 'update' as const,
      blockId: e.blockId,
      data: e.data,
      timestamp: e.timestamp,
      seqId: ++this.seqCounter,
    }));
    this.pendingQueue.enqueue(deltas);
    this.onEnqueue?.();
    this.checkOverflowAndSend();
  }

  /** 入队时通知 Pipeline 展示「保存中」 */
  setOnEnqueue(cb: () => void): void {
    this.onEnqueue = cb;
  }
  private onEnqueue: (() => void) | null = null;

  disposeTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.idleSendTimer) {
      clearTimeout(this.idleSendTimer);
      this.idleSendTimer = null;
    }
  }
}
