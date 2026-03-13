/**
 * Store 统一入口
 *
 * - zustand/: 内存状态管理（UI 状态、临时数据）
 * - indexedDB/: 离线缓存（未同步的变更）
 */

// Zustand stores
export {
  useDrivePreferencesStore,
  useRecentFilesStore,
  type DriveViewMode,
  type RecentFileItem,
} from './zustand';

// IndexedDB (离线缓存)
export {
  getDB,
  closeDB,
  appendPendingDelta,
  appendPendingDeltas,
  getPendingDeltas,
  clearPendingDeltas,
  hasPendingDeltas,
  getNotesWithPendingDeltas,
} from './indexedDB';
