/**
 * SyncQueue - 待发送队列
 * 移植自 blocknote PendingQueue，按 batch 顺序追加，禁止去重
 */

import type { JsonDelta } from '@/types/editor';

export class PendingQueue {
  private queue: JsonDelta[] = [];

  enqueue(deltas: JsonDelta[]): void {
    this.queue.push(...deltas);
  }

  flush(): JsonDelta[] {
    const items = [...this.queue];
    this.queue = [];
    return items;
  }

  getAll(): JsonDelta[] {
    return [...this.queue];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
