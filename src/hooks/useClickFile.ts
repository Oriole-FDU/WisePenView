import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResourceItem } from '@/types/resource';
import { useRecentFilesStore } from '@/store';

/**
 * 根据资源类型：NOTE 跳转笔记编辑器，其他类型跳转站内 PDF 预览（/app/pdf/:resourceId）
 * 点击文件会加入最近使用列表
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
        navigate(`/app/pdf/${encodeURIComponent(resourceId)}`);
      }
    },
    [navigate, addFile]
  );

  return openResource;
};
