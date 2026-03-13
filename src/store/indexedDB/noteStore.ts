/**
 * 笔记 Pending 缓存 - IndexedDB 存储操作
 * 仅缓存未发送的变更队列
 */

import { getDB } from './db';
import type { NotePendingCache } from './types';
import type { JsonDelta } from '@/types/note';

/**
 * 保存笔记的 pending 缓存
 */
export async function savePendingCache(
  noteId: string,
  baseVersion: number,
  seqCounter: number,
  pendingQueue: JsonDelta[]
): Promise<void> {
  const db = await getDB();
  const cache: NotePendingCache = {
    noteId,
    baseVersion,
    seqCounter,
    pendingQueue,
    updatedAt: Date.now(),
  };
  await db.put('notes', cache);
}

/**
 * 获取笔记的 pending 缓存
 */
export async function getPendingCache(noteId: string): Promise<NotePendingCache | undefined> {
  const db = await getDB();
  return db.get('notes', noteId);
}

/**
 * 删除笔记的 pending 缓存
 */
export async function deletePendingCache(noteId: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', noteId);
}

/**
 * 获取所有 pending 缓存
 */
export async function getAllPendingCaches(): Promise<NotePendingCache[]> {
  const db = await getDB();
  return db.getAll('notes');
}

/**
 * 清空所有 pending 缓存
 */
export async function clearAllPendingCaches(): Promise<void> {
  const db = await getDB();
  await db.clear('notes');
}

/**
 * 检查笔记是否有 pending 缓存
 */
export async function hasPendingCache(noteId: string): Promise<boolean> {
  const db = await getDB();
  const cache = await db.get('notes', noteId);
  return cache !== undefined && cache.pendingQueue.length > 0;
}

/**
 * 获取所有有未发送变更的笔记 ID
 */
export async function getNotesWithPendingChanges(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  return all.filter((cache) => cache.pendingQueue.length > 0).map((cache) => cache.noteId);
}
