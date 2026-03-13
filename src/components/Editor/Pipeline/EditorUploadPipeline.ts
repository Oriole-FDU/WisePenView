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
 */

import type { DeltaOp, EditorChange, JsonDelta } from '@/types/editor';
import { UpdateBuffer } from './UpdateBuffer';
import { PendingQueue } from './PendingQueue';
import { OnFlightList } from './OnFlightList';

interface PipelineConfig {
  debounceMs: number;
  idleSendMs: number;
  pendingQueueLimit: number;
}

const Config: PipelineConfig = {
  debounceMs: 500,
  idleSendMs: 60000,
  pendingQueueLimit: 100,
};

export class EditorUploadPipeline {
  private seqCounter = 0;
  private readonly updateBuffer = new UpdateBuffer();
  private readonly pendingQueue = new PendingQueue();
  private readonly onFlightList = new OnFlightList();

  private readonly debounceMs = Config.debounceMs;
  private readonly idleSendMs = Config.idleSendMs;
  private readonly pendingQueueLimit = Config.pendingQueueLimit;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private idleSendTimer: ReturnType<typeof setTimeout> | null = null;

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
  private enqueueStructureChange(structureChanges: EditorChange[]): void {
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
    this.checkOverflowAndSend();
  }

  /**
   * 接收 editor 的修改，仅缓存变更（不直接推送）。
   * 防抖区的 flush 由 debounceTimer 触发；若有结构变更则立即 flush updateBuffer 后入队结构变更，
   * 保证防抖区域优先写队列。
   * seqId 统一在入队时分配。
   */
  refresh(changes: EditorChange[]): void {
    //
    this.triggerDebounceFlushTimer();
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

    // 仅内容变更：由计时器触发 flush，无结构变更时 mutual exclusion
    if (updateChanges.length > 0 && structureChanges.length === 0) {
      // 关于竞态问题：timer到期时，refresh被触发，二者可能对queue做时间上非常接近的写操作
      // js单线程，因此二者会互相阻塞
      // 如果refresh先执行，那计时器被取消，enqueueUpdateBuffer不会被执行
      // 如果计时器先执行，那refresh被阻塞，flush的都是update操作，不会影响还原
      // 因此这里的时序问题不需要担心
      this.enqueueUpdateBuffer();
      this.triggerDebounceFlushTimer();
    }
  }

  /** send() 会被overFlow 或 timeout触发，是队列内部事件，作为private */
  private send(): void {
    const sendmsg: JsonDelta[] = this.pendingQueue.flush();
    this.onFlightList.add(sendmsg);
  }

  // ── sendFail：onFlight 回滚到 syncQueue ──
  requeueOnSendFail(): void {
    const deltas = this.onFlightList.getAll();
    this.onFlightList.removeAll();
    if (deltas.length > 0) {
      this.pendingQueue.enqueue(deltas);
      this.checkOverflowAndSend();
    }
  }

  /** 发送成功，清空 onFlight */
  confirmSendSuccess(): void {
    this.onFlightList.removeAll();
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
}
