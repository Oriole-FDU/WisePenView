/**
 * Store 统一入口
 *
 * - zustand/: 内存状态管理（UI 状态、临时数据）
 * - indexedDB/: 持久化存储（pending 队列缓存）
 */

// Zustand stores
export {
  useDrivePreferencesStore,
  useRecentFilesStore,
  type DriveViewMode,
  type RecentFileItem,
} from './zustand';

// IndexedDB stores
export {
  getDB,
  closeDB,
  savePendingCache,
  getPendingCache,
  deletePendingCache,
  getAllPendingCaches,
  clearAllPendingCaches,
  hasPendingCache,
  getNotesWithPendingChanges,
  type NotePendingCache,
} from './indexedDB';
