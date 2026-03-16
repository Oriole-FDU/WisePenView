/**
 * IndexedDB 存储模块入口
 * 用于缓存离线期间未同步的变更（append-only）
 */

export { getDB, closeDB } from './db';
export {
  appendPendingDeltas,
  getPendingDeltas,
  clearPendingDeltas,
  saveNoteSnapshot,
  getNoteSnapshot,
  clearNoteSnapshot,
} from './noteStore';
