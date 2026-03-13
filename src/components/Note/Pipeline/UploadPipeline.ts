/**
 * EditorUploadPipeline - 统一编排变更到 PendingQueue、OnFlightList
 *
 * 设计原则：
 * - refresh() 只负责缓存变更（update → UpdateBuffer），不直接推送
 * - 防抖区域的推送由 debounceTimer 触发，可能与 refresh 并发
 * - 入队时防抖区域优先：updateBuffer flush 先于结构变更入队
 *
 * 数据流：
 * - 结构变更（insert/delete/move）→ 直接入 pendingQueue
 * - 内容变更（update）→ UpdateBuffer 防抖后由计时器 flush 入 pendingQueue
 *
 * 网络状态：
 * - online 模式：正常发送请求
 * - offline 模式：send 写入 IndexedDB，指数退避重试恢复连接
 */

import type { DeltaOp, NoteChange, JsonDelta, SyncPayload } from '@/types/note';
import type { INoteService } from '@/services/Note';
import { UpdateBuffer } from './UpdateBuffer';
import { PendingQueue } from './PendingQueue';
import { OnFlightList } from './OnFlightList';
import { appendPendingDeltas, getPendingDeltas, clearPendingDeltas } from '@/store/indexedDB';

/** 网络连接状态 */
export type ConnectionState = 'online' | 'offline';

// pipeline配置参数
const Config = {
  debounceMs: 500, // debounce防抖时长，控制debounce粒度
  idleSendMs: 10000, // idleSendMs，用户长时间无编辑同步
  pendingQueueLimit: 100, // pendingQueue容量，满则同步
  retryBaseMs: 1000, // 指数退避初始间隔
  retryMaxMs: 60000, // 指数退避最大间隔
};

/** 保存状态 */
export type SaveStatus = 'saving' | 'saved' | 'offline';

/** Pipeline 构造参数 */
export interface UploadPipelineOptions {
  noteService: INoteService;
  docId: string;
  initialVersion: number;
  /** 发送失败时的回调，上层可用于触发 recovery / 本地缓存 */
  onSyncFail?: (error: unknown) => void;
  /** 连接状态变化回调，用于 UI 展示 */
  onConnectionStateChange?: (state: ConnectionState) => void;
  /** 保存状态变化回调，用于 UI 展示 */
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export class UploadPipeline {
  private seqCounter = 0;
  private readonly updateBuffer = new UpdateBuffer();
  private readonly pendingQueue = new PendingQueue();
  private readonly onFlightList = new OnFlightList();

  private readonly debounceMs = Config.debounceMs;
  private readonly idleSendMs = Config.idleSendMs;
  private readonly pendingQueueLimit = Config.pendingQueueLimit;
  private readonly retryBaseMs = Config.retryBaseMs;
  private readonly retryMaxMs = Config.retryMaxMs;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private idleSendTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly noteService: INoteService;
  private readonly docId: string;
  private baseVersion: number;
  private readonly onSyncFail?: (error: unknown) => void;
  private readonly onConnectionStateChange?: (state: ConnectionState) => void;
  private readonly onSaveStatusChange?: (status: SaveStatus) => void;

  /** 网络连接状态 */
  private connectionState: ConnectionState = 'online';
  /** 当前重试间隔（指数退避） */
  private currentRetryMs: number = Config.retryBaseMs;
  /** 重试次数，用于日志/调试 */
  private retryCount = 0;
  /** 当前保存状态 */
  private saveStatus: SaveStatus = 'saved';
  /** 保存中状态的最小显示时间定时器 */
  private savingDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  /** 是否正在显示"保存中"状态（用于最小显示时间控制） */
  private isSavingDisplayLocked = false;

  constructor(options: UploadPipelineOptions) {
    this.noteService = options.noteService;
    this.docId = options.docId;
    this.baseVersion = options.initialVersion;
    this.onSyncFail = options.onSyncFail;
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.onSaveStatusChange = options.onSaveStatusChange;

    // 启动时检查并同步 IndexedDB 中的离线数据
    this.syncOnInit();
  }

  /**
   * 显示"保存中"状态（带 500ms 最小显示时间）
   * @param forceResetToSaved 为 true 时，500ms 后直接切换到 saved；否则需检查队列
   */
  private showSaving(forceResetToSaved = false): void {
    // 已经在显示"保存中"，跳过
    if (this.saveStatus === 'saving') return;

    this.saveStatus = 'saving';
    this.isSavingDisplayLocked = true;
    this.onSaveStatusChange?.('saving');

    // 清除之前的定时器
    if (this.savingDisplayTimer) {
      clearTimeout(this.savingDisplayTimer);
    }

    // forceResetToSaved: 1s-1.5s 随机值；否则 500ms
    const delay = forceResetToSaved ? 1000 + Math.random() * 500 : 500;
    this.savingDisplayTimer = setTimeout(() => {
      this.savingDisplayTimer = null;
      this.isSavingDisplayLocked = false;
      if (forceResetToSaved) {
        // 直接切换到 saved（用于 refresh 触发的 UI 反馈）
        this.saveStatus = 'saved';
        this.onSaveStatusChange?.('saved');
      } else {
        // 检查队列状态再决定（用于 onflight 触发）
        this.updateSaveStatus();
      }
    }, delay);
  }

  /** 更新并通知保存状态 */
  private updateSaveStatus(): void {
    // 离线状态优先级最高
    if (this.connectionState === 'offline') {
      if (this.saveStatus !== 'offline') {
        this.saveStatus = 'offline';
        this.onSaveStatusChange?.('offline');
      }
      return;
    }

    // 如果正在锁定显示"保存中"，不切换到 saved
    if (this.isSavingDisplayLocked) {
      return;
    }

    // 队列全空时切换到 saved
    if (!this.hasDirty() && !this.hasPending()) {
      if (this.saveStatus !== 'saved') {
        this.saveStatus = 'saved';
        this.onSaveStatusChange?.('saved');
      }
    }
  }

  /** 获取当前保存状态 */
  getSaveStatus(): SaveStatus {
    return this.saveStatus;
  }

  /** 初始化时同步 IndexedDB 中可能存在的离线数据 */
  private async syncOnInit(): Promise<void> {
    try {
      const offlineDeltas = await getPendingDeltas(this.docId);
      if (offlineDeltas.length > 0) {
        // 有离线数据，入队并发送
        this.pendingQueue.prepend(offlineDeltas);
        await clearPendingDeltas(this.docId);
        this.send();
      }
    } catch {
      // 读取失败，忽略
    }
  }

  /** 获取当前连接状态 */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /** 是否处于离线模式 */
  isOffline(): boolean {
    return this.connectionState === 'offline';
  }

  /** Sender 是否繁忙（有请求在飞） */
  isSenderBusy(): boolean {
    return !this.onFlightList.isEmpty();
  }

  /** 获取当前 base_version */
  getBaseVersion(): number {
    return this.baseVersion;
  }

  /** 开启防抖计时 */
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

  /** 开启自动发送计时 */
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

  /** 每次 enqueue 后检查，超过上限则 send */
  private checkOverflowAndSend(): void {
    if (this.pendingQueue.size() > this.pendingQueueLimit) {
      this.send();
    }
  }

  /** 将结构变更（insert/delete/move）入队，入队时分配 seqId */
  private enqueueStructureChange(structureChanges: NoteChange[]): void {
    if (structureChanges.length === 0) return;
    this.pendingQueue.enqueue(
      structureChanges.map((c) => {
        const op = c.type as DeltaOp;
        return {
          op,
          blockId: c.block.id,
          data: c.type !== 'delete' ? c.block : undefined,
          timestamp: Date.now(),
          seqId: ++this.seqCounter,
        } satisfies JsonDelta;
      })
    );
    this.showSaving(true);
    this.checkOverflowAndSend();
  }

  /** 将 updateBuffer 内容入队，入队时分配 seqId */
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
    this.showSaving(true);
    this.checkOverflowAndSend();
  }

  /**
   * 接收 editor 的修改，仅缓存变更（不直接推送）。
   * 防抖区的 flush 由 debounceTimer 触发；若有结构变更则立即 flush updateBuffer 后入队结构变更，
   * 保证防抖区域优先写队列。
   * seqId 统一在入队时分配。
   */
  refresh(changes: NoteChange[]): void {
    // 顶部清零：取消未到期的防抖计时器，避免与后续逻辑竞态
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.triggerIdleSendTimer();

    // 分离 update 和结构变更，不关心顺序
    const structureChanges = changes.filter(
      (c) => c.type === 'insert' || c.type === 'delete' || c.type === 'move'
    );
    const updateChanges = changes.filter((c) => c.type === 'update');

    // update入队防抖
    for (const c of updateChanges) {
      this.updateBuffer.set(c.block.id, c.block);
    }

    // 如果有结构变更，则先输出updateBuffer，这样可以保证updateBuffer中的内容先于结构变更入队
    // updateBuffer中的update都是粒度更小的变更，不会影响结构，因此不用关心结构变更和update的实际发生顺序，
    // 即便先发生结构变更，后发生update，update先于结构变更入队也不会影响后端还原的逻辑。
    // 时间戳基本是同时的，也不会影响文档还原的逻辑
    // 按此规则构造的delta队列，可以保证后端还原的逻辑正确
    if (structureChanges.length > 0) {
      this.enqueueUpdateBuffer();
      this.enqueueStructureChange(structureChanges);
    }

    // 仅内容变更：在此处启动防抖计时器，到期后由 timer 触发 flush
    if (updateChanges.length > 0 && structureChanges.length === 0) {
      // 底部开启：开始500ms，会被refresh打断
      this.triggerDebounceFlushTimer();
    }
  }

  /**
   * 发送 pending 队列中的 deltas 到云端
   * - 若 senderBusy（onFlight 非空），跳过本次调用
   * - offline 模式下直接 append 到 IndexedDB（作为离线后端）
   * - 异步执行，不阻塞主流程
   */
  private send(): void {
    // 阻塞写
    if (this.isSenderBusy()) {
      return;
    }

    // 无pending不写
    const deltas = this.pendingQueue.flush();
    if (deltas.length === 0) {
      return;
    }

    // offline 模式：append 到 IndexedDB（作为离线后端）
    if (this.connectionState === 'offline') {
      appendPendingDeltas(this.docId, deltas).catch(() => {
        // 写入失败，回滚到 pendingQueue
        this.pendingQueue.prepend(deltas);
      });
      return;
    }

    this.onFlightList.add(deltas);

    const payload: SyncPayload = {
      base_version: this.baseVersion,
      send_timestamp: Date.now(),
      deltas,
    };

    this.noteService
      .syncNote(this.docId, payload)
      .then((res) => {
        this.confirmSendSuccess(res.new_version);
      })
      .catch((error: unknown) => {
        this.requeueOnSendFail(error);
      });
  }

  /** 发送成功：清空 onFlight，更新 baseVersion */
  private confirmSendSuccess(newVersion: number): void {
    this.onFlightList.removeAll();
    this.baseVersion = newVersion;
    this.updateSaveStatus();
    // 如果 pendingQueue 还有数据，继续发送
    if (!this.pendingQueue.isEmpty()) {
      this.send();
    }
  }

  /** 发送失败：onFlight 写入 IndexedDB，进入 offline 模式 */
  private requeueOnSendFail(error: unknown): void {
    const deltas = this.onFlightList.getAll();
    this.onFlightList.removeAll();

    // 进入 offline 模式
    this.enterOfflineMode();

    // 失败的数据写入 IndexedDB（作为离线后端）
    if (deltas.length > 0) {
      appendPendingDeltas(this.docId, deltas).catch(() => {
        // 写入失败，回滚到 pendingQueue 等待重试
        this.pendingQueue.prepend(deltas);
      });
    }

    this.onSyncFail?.(error);
  }

  /** 进入 offline 模式，启动指数退避重试 */
  private enterOfflineMode(): void {
    if (this.connectionState === 'offline') {
      return;
    }

    this.connectionState = 'offline';
    this.currentRetryMs = this.retryBaseMs;
    this.retryCount = 0;
    this.onConnectionStateChange?.('offline');
    this.updateSaveStatus();

    this.scheduleRetry();
  }

  /** 恢复 online 模式 */
  private enterOnlineMode(): void {
    if (this.connectionState === 'online') {
      return;
    }

    this.connectionState = 'online';
    this.currentRetryMs = this.retryBaseMs;
    this.retryCount = 0;

    // 清除重试定时器
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.onConnectionStateChange?.('online');
    this.updateSaveStatus();

    // 继续发送内存中的 pending 数据（如果有）
    if (!this.pendingQueue.isEmpty()) {
      this.send();
    }
  }

  /** 调度指数退避重试 */
  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.attemptReconnect();
    }, this.currentRetryMs);
  }

  /** 尝试重新连接：从 IndexedDB 读取数据尝试发送 */
  private async attemptReconnect(): Promise<void> {
    this.retryCount++;

    // 从 IndexedDB 读取离线数据
    let deltas: JsonDelta[] = [];
    try {
      deltas = await getPendingDeltas(this.docId);
    } catch {
      // 读取失败，继续重试
      this.scheduleRetry();
      return;
    }

    if (deltas.length === 0) {
      // 无数据需要同步，直接恢复 online
      this.enterOnlineMode();
      return;
    }

    // 发送前先清除 IndexedDB（发送过程中新增的数据会重新写入）
    try {
      await clearPendingDeltas(this.docId);
    } catch {
      // 清除失败，继续重试
      this.scheduleRetry();
      return;
    }

    this.onFlightList.add(deltas);

    const payload: SyncPayload = {
      base_version: this.baseVersion,
      send_timestamp: Date.now(),
      deltas,
    };

    this.noteService
      .syncNote(this.docId, payload)
      .then((res) => {
        this.onFlightList.removeAll();
        this.baseVersion = res.new_version;
        // 恢复 online 模式
        this.enterOnlineMode();
      })
      .catch(() => {
        // 重试失败，把数据写回 IndexedDB
        const failedDeltas = this.onFlightList.getAll();
        this.onFlightList.removeAll();

        if (failedDeltas.length > 0) {
          appendPendingDeltas(this.docId, failedDeltas).catch(() => {
            // 写回失败，放入内存队列
            this.pendingQueue.prepend(failedDeltas);
          });
        }

        // 指数退避
        this.currentRetryMs = Math.min(this.currentRetryMs * 2, this.retryMaxMs);
        this.scheduleRetry();
      });
  }

  // ── 状态查询（供 SaveStatusLight 等 UI 使用）──
  hasDirty(): boolean {
    return this.updateBuffer.hasDirty();
  }

  getPendingCount(): number {
    return this.pendingQueue.size() + this.onFlightList.size();
  }

  hasPending(): boolean {
    return !this.pendingQueue.isEmpty() || !this.onFlightList.isEmpty();
  }

  /** 清理 timer，组件卸载时调用 */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.idleSendTimer) {
      clearTimeout(this.idleSendTimer);
      this.idleSendTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.savingDisplayTimer) {
      clearTimeout(this.savingDisplayTimer);
      this.savingDisplayTimer = null;
    }

    // 如果有未发送的数据，写入 IndexedDB 保存
    this.flushAllToIndexedDB();
  }

  /** 将所有未发送的数据写入 IndexedDB */
  private flushAllToIndexedDB(): void {
    // 收集所有未发送的数据
    const allDeltas: JsonDelta[] = [];

    // 1. flush updateBuffer
    const entries = this.updateBuffer.flushSortedByTimestamp();
    for (const e of entries) {
      allDeltas.push({
        op: 'update' as const,
        blockId: e.blockId,
        data: e.data,
        timestamp: e.timestamp,
        seqId: ++this.seqCounter,
      });
    }

    // 2. pendingQueue
    allDeltas.push(...this.pendingQueue.flush());

    // 3. onFlightList
    allDeltas.push(...this.onFlightList.getAll());
    this.onFlightList.removeAll();

    // 写入 IndexedDB
    if (allDeltas.length > 0) {
      appendPendingDeltas(this.docId, allDeltas).catch(() => {
        // 忽略写入失败
      });
    }
  }
}
