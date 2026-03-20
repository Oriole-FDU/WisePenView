import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResourceItem } from '@/types/resource';
import { useRecentFilesStore } from '@/store';

/**
 * 根据资源类型决定打开方式：NOTE 跳转编辑器，其他类型预览
 * 点击文件会加入最近使用列表
 */
export const useClickFile = () => {
  const navigate = useNavigate();
  const addFile = useRecentFilesStore((s) => s.addFile);

  const openResource = useCallback(
    (item: ResourceItem) => {
      const { resourceId, resourceName, resourceType, preview } = item;
      if (resourceId == null || resourceId === '') return;
      addFile({
        resourceId,
        resourceName: resourceName ?? '',
        resourceType,
      });
      if (resourceType === 'NOTE') {
        navigate(`/app/note/${resourceId}`);
      } else {
        if (preview) {
          window.open(preview, '_blank');
        }
        // TODO: 其他类型的预览逻辑
      }
    },
    [navigate, addFile]
  );

  return openResource;
};
