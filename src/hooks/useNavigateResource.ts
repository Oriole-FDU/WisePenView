import { RESOURCE_TYPE } from '@/domains/Resource';
import { useActiveDriveScopeStore, usePdfPreviewProgressStore } from '@/store';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface NavigateResourceFn {
  (resourceId: string, resourceType?: string): void;
}

/**
 * 资源跳转的统一入口：NOTE 跳笔记编辑器，其余视为 PDF 站内预览（尝试恢复 page/zoom）。
 *
 * 跳转前会把当前 scope（groupId）写入 useActiveDriveScopeStore，
 * 让 SidebarDrive 等下游消费组件继承“点击发起方”的 scope。
 */
export const useNavigateResource = (groupId?: string): NavigateResourceFn => {
  const navigate = useNavigate();

  return useCallback(
    (resourceId, resourceType) => {
      if (!resourceId) return;
      useActiveDriveScopeStore.getState().setGroupId(groupId);

      if (resourceType === RESOURCE_TYPE.NOTE) {
        navigate(`/app/note/${encodeURIComponent(resourceId)}`);
        return;
      }

      const progress = usePdfPreviewProgressStore.getState().progressByResourceId[resourceId];
      const qs = new URLSearchParams();
      if (progress != null) {
        qs.set('page', String(progress.page));
        qs.set('zoom', progress.zoom);
      }
      const basePath = `/app/pdf/${encodeURIComponent(resourceId)}`;
      navigate(qs.size > 0 ? `${basePath}?${qs.toString()}` : basePath);
    },
    [navigate, groupId]
  );
};
