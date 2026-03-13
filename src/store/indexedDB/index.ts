/**
 * IndexedDB 存储模块入口
 * 仅缓存 pending 队列，确保未发送变更不丢失
 */

export { getDB, closeDB } from './db';
export {
  savePendingCache,
  getPendingCache,
  deletePendingCache,
  getAllPendingCaches,
  clearAllPendingCaches,
  hasPendingCache,
  getNotesWithPendingChanges,
} from './noteStore';
export type { NotePendingCache } from './types';
