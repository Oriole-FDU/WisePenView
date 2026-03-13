/**
 * UpdateBuffer - 仅缓存 update 类型的变更，用于防抖
 * 不负责 seqId，由 Pipeline 入队时统一分配
 */

interface UpdateEntry {
  blockId: string;
  data: unknown;
  timestamp: number;
}

export class UpdateBuffer {
  private map = new Map<string, UpdateEntry>();

  set(blockId: string, data: unknown): void {
    this.map.set(blockId, {
      blockId,
      data,
      timestamp: Date.now(),
    });
  }

  /** 按 timestamp 排序后取出并清空 */
  flushSortedByTimestamp(): UpdateEntry[] {
    const items = Array.from(this.map.values()).sort((a, b) => a.timestamp - b.timestamp);
    this.map.clear();
    return items;
  }

  hasDirty(): boolean {
    return this.map.size > 0;
  }
}
