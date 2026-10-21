import { toast } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';

import i18n from '@/i18n';

import type { SkillWorkspaceDraftState } from '../models/workspaceDraft';
import {
  clearSkillDraftCache,
  loadSkillDraftCache,
  saveSkillDraftCache,
  type SkillDraftCacheSnapshot,
} from '../utils/skillDraftCache';

function isMatchingCache(
  snapshot: SkillDraftCacheSnapshot,
  accountId: string,
  draftVersion: number
): boolean {
  return (
    snapshot.schemaVersion === 2 &&
    snapshot.accountId === accountId &&
    snapshot.draftVersion === draftVersion
  );
}

interface UseSkillWorkspaceCacheControllerOptions {
  accountId: string;
  resourceKey: string;
  resourceId: string;
  draftVersion: number;
  state: SkillWorkspaceDraftState;
  hasUnsavedChanges: boolean;
  onRestore: (snapshot: SkillDraftCacheSnapshot['workspace']) => void;
}

export function useSkillWorkspaceCacheController({
  accountId,
  resourceKey,
  resourceId,
  draftVersion,
  state,
  hasUnsavedChanges,
  onRestore,
}: UseSkillWorkspaceCacheControllerOptions) {
  const writeVersionRef = useRef(0);
  const [readyKey, setReadyKey] = useState<string | null>(null);

  const invalidateWrites = () => {
    writeVersionRef.current += 1;
  };

  const clearDraftCache = async () => {
    if (!resourceId || !accountId) return;
    invalidateWrites();
    await clearSkillDraftCache(resourceId, accountId).catch(() => undefined);
  };

  /**
   * @wisepen-manual-effect
   * 执行时机：Skill 资源或草稿版本变化后读取对应的 IndexedDB 多文件草稿。
   * 不可替代原因：IndexedDB 是 React 外部异步存储，恢复结果必须与当前资源 key 校验后写入状态。
   * cleanup：废弃旧资源的异步读取，避免其覆盖新资源状态。
   */
  useEffect(() => {
    if (!resourceId || !draftVersion || !resourceKey || !accountId) return;
    let disposed = false;
    invalidateWrites();
    void loadSkillDraftCache(resourceId, accountId)
      .then((snapshot) => {
        if (disposed) return;
        if (snapshot && isMatchingCache(snapshot, accountId, draftVersion)) {
          onRestore(snapshot.workspace);
          toast.warning(i18n.t('toast.draftRestored', { ns: 'skill' }));
        } else if (snapshot) {
          void clearSkillDraftCache(resourceId, accountId);
        }
        setReadyKey(resourceKey);
      })
      .catch(() => {
        if (!disposed) setReadyKey(resourceKey);
      });
    return () => {
      disposed = true;
    };
  }, [accountId, draftVersion, onRestore, resourceId, resourceKey]);

  /**
   * @wisepen-manual-effect
   * 执行时机：多文件草稿、文件树或 Config 草稿变化后防抖写入 IndexedDB。
   * 不可替代原因：IndexedDB 与 Blob 持久化属于 React 外部异步存储。
   * cleanup：取消未开始的写入，并通过版本令牌废弃已失效任务。
   */
  useEffect(() => {
    if (!resourceId || !draftVersion || readyKey !== resourceKey || !hasUnsavedChanges) return;
    const writeVersion = writeVersionRef.current;
    const timer = window.setTimeout(() => {
      if (writeVersionRef.current !== writeVersion) return;
      const cacheToken = `${resourceKey}:${writeVersion}:${Date.now()}`;
      const snapshot: SkillDraftCacheSnapshot = {
        accountId,
        schemaVersion: 2,
        resourceId,
        draftVersion,
        cacheToken,
        workspace: { ...state, pendingIntent: null },
        updatedAt: Date.now(),
      };
      void saveSkillDraftCache(snapshot)
        .then(() => {
          if (writeVersionRef.current === writeVersion) return;
          void loadSkillDraftCache(resourceId, accountId).then((cached) => {
            if (cached?.cacheToken === cacheToken) {
              void clearSkillDraftCache(resourceId, accountId);
            }
          });
        })
        .catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [accountId, draftVersion, hasUnsavedChanges, readyKey, resourceId, resourceKey, state]);

  /**
   * @wisepen-manual-effect
   * 执行时机：工作区恢复完成且所有草稿均已保存或丢弃时删除本地快照。
   * 不可替代原因：IndexedDB 是 React 外部持久化存储，需要显式清理。
   * cleanup：删除操作幂等，无额外订阅需要清理。
   */
  useEffect(() => {
    if (!resourceId || !accountId || readyKey !== resourceKey || hasUnsavedChanges) return;
    invalidateWrites();
    void clearSkillDraftCache(resourceId, accountId).catch(() => undefined);
  }, [accountId, hasUnsavedChanges, readyKey, resourceId, resourceKey]);

  return { clearDraftCache };
}
