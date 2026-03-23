import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResourceItem } from '@/types/resource';
import { usePdfPreviewProgressStore, useRecentFilesStore } from '@/store';

/**
 * 根据资源类型：NOTE 跳转笔记编辑器，其他类型跳转站内 PDF 预览（/app/pdf/:resourceId）
 * 点击文件会加入最近使用列表。
 */
export const useClickFile = () => {
  const navigate = useNavigate();
  const addFile = useRecentFilesStore((s) => s.addFile);

  const openResource = useCallback(
    (item: ResourceItem) => {
      const { resourceId, resourceName, resourceType } = item;
      if (resourceId == null || resourceId === '') return;
      addFile({
        resourceId,
        resourceName: resourceName ?? '',
        resourceType,
      });
      if (resourceType === 'NOTE') {
        navigate(`/app/note/${resourceId}`);
      } else {
        // 尝试恢复上次的阅读状态
        const progress = usePdfPreviewProgressStore.getState().progressByResourceId[resourceId];
        const qs = new URLSearchParams();
        if (progress != null) {
          qs.set('page', String(progress.page));
          qs.set('zoom', progress.zoom);
        }
        const basePath = `/app/pdf/${encodeURIComponent(resourceId)}`;
        navigate(qs.size > 0 ? `${basePath}?${qs.toString()}` : basePath);
      }
    },
    [navigate, addFile]
  );

  return openResource;
};
