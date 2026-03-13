/**
 * OnFlight - 发送中的 delta 暂存
 * 移植自 blocknote OnFlightList
 */

import type { JsonDelta } from '@/types/editor';

export class OnFlightList {
  private list: JsonDelta[] = [];

  add(deltas: JsonDelta[]): void {
    this.list.push(...deltas);
  }

  removeAll(): void {
    this.list = [];
  }

  getAll(): JsonDelta[] {
    return [...this.list];
  }

  size(): number {
    return this.list.length;
  }

  isEmpty(): boolean {
    return this.list.length === 0;
  }
}
