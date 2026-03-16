/**
 * LocalNoteStorage - 本地笔记存储读写封装
 * 心智负担最小：能读、能写。委托 store/indexedDB 实现。
 */

import type { JsonDelta, Block } from '@/types/note';
import {
  appendPendingDeltas,
  getPendingDeltas,
  clearPendingDeltas,
  saveNoteSnapshot,
  getNoteSnapshot,
  clearNoteSnapshot,
} from '@/store/indexedDB';

/** 快照写入结构 */
export interface SnapshotData {
  version: number;
  blocks: Block[];
  title?: string;
}

/** 快照读取结构（与 store 一致） */
export interface SnapshotRecord {
  noteId: string;
  version: number;
  blocks: Block[];
  title?: string;
  createdAt: number;
}

export class LocalNoteStorage {
  /** 写入 pending deltas（追加） */
  async writePending(noteId: string, deltas: JsonDelta[]): Promise<void> {
    await appendPendingDeltas(noteId, deltas);
  }

  /** 读取 pending deltas */
  async readPending(noteId: string): Promise<JsonDelta[]> {
    return getPendingDeltas(noteId);
  }

  /** 清除指定笔记的 pending */
  async clearPending(noteId: string): Promise<void> {
    await clearPendingDeltas(noteId);
  }

  /** 写入快照（覆盖同 noteId） */
  async writeSnapshot(noteId: string, data: SnapshotData): Promise<void> {
    await saveNoteSnapshot(noteId, data);
  }

  /** 读取快照 */
  async readSnapshot(noteId: string): Promise<SnapshotRecord | null> {
    return getNoteSnapshot(noteId);
  }

  /** 清除指定笔记的快照 */
  async clearSnapshot(noteId: string): Promise<void> {
    await clearNoteSnapshot(noteId);
  }
}
