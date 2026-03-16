/**
 * 笔记 Pending 缓存 - IndexedDB 存储操作
 * 使用 append-only 模式缓存离线期间未同步的变更
 */

import { getDB, type PendingDeltaRecord, type NoteSnapshotRecord } from './db';
import type { JsonDelta, Block } from '@/types/note';

/**
 * 批量追加 pending deltas
 */
export async function appendPendingDeltas(noteId: string, deltas: JsonDelta[]): Promise<void> {
  if (deltas.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('pendingDeltas', 'readwrite');
  const now = Date.now();
  for (const delta of deltas) {
    await tx.store.add({ noteId, delta, createdAt: now });
  }
  await tx.done;
}

/**
 * 获取指定笔记的所有 pending deltas（按插入顺序）
 */
export async function getPendingDeltas(noteId: string): Promise<JsonDelta[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('pendingDeltas', 'noteId', noteId);
  // 按 id 排序确保顺序正确（autoIncrement 保证插入顺序）
  records.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  return records.map((r) => r.delta);
}

/**
 * 清除指定笔记的所有 pending deltas
 */
export async function clearPendingDeltas(noteId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pendingDeltas', 'readwrite');
  const index = tx.store.index('noteId');
  let cursor = await index.openCursor(noteId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/**
 * 检查指定笔记是否有 pending deltas
 */
export async function hasPendingDeltas(noteId: string): Promise<boolean> {
  const db = await getDB();
  const count = await db.countFromIndex('pendingDeltas', 'noteId', noteId);
  return count > 0;
}

/**
 * 获取所有有 pending deltas 的笔记 ID
 */
export async function getNotesWithPendingDeltas(): Promise<string[]> {
  const db = await getDB();
  const records = await db.getAll('pendingDeltas');
  const noteIds = new Set(records.map((r) => r.noteId));
  return Array.from(noteIds);
}

/**
 * 保存指定笔记的快照（会覆盖同 noteId 的旧快照）
 */
export async function saveNoteSnapshot(
  noteId: string,
  snapshot: { version: number; blocks: Block[]; title?: string }
): Promise<void> {
  const db = await getDB();
  const record: NoteSnapshotRecord = {
    noteId,
    version: snapshot.version,
    blocks: snapshot.blocks,
    title: snapshot.title,
    createdAt: Date.now(),
  };
  await db.put('noteSnapshots', record);
}

/**
 * 获取指定笔记的快照
 */
export async function getNoteSnapshot(noteId: string): Promise<NoteSnapshotRecord | null> {
  const db = await getDB();
  const record = await db.get('noteSnapshots', noteId);
  return record ?? null;
}

/**
 * 清除指定笔记的快照
 */
export async function clearNoteSnapshot(noteId: string): Promise<void> {
  const db = await getDB();
  await db.delete('noteSnapshots', noteId);
}
