/**
 * IndexedDB 存储类型定义
 * 仅缓存 pending 队列，确保未发送变更不丢失
 */

import type { JsonDelta } from '@/types/note';

/** 笔记 Pending 缓存 - 用于恢复未发送的变更 */
export interface NotePendingCache {
  noteId: string;
  baseVersion: number;
  seqCounter: number;
  pendingQueue: JsonDelta[];
  updatedAt: number;
}
