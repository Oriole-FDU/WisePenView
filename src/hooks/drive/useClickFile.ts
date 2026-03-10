import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ResourceItem } from '@/types/resource';

/**
 * 根据资源类型决定打开方式：NOTE 跳转编辑器，其他类型预览
 */
export const useClickFile = () => {
  const navigate = useNavigate();

  const openResource = useCallback(
    (item: ResourceItem) => {
      const { resourceId, resourceType, preview } = item;
      if (resourceType === 'NOTE') {
        navigate(`/app/editor/${resourceId}`);
      } else {
        if (preview) {
          window.open(preview, '_blank');
        }
        // TODO: 其他类型的预览逻辑
      }
    },
    [navigate]
  );

  return openResource;
};
