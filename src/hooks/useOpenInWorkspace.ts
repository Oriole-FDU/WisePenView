import { usePdfPreviewProgressStore } from '@/components/PdfViewer/_store/usePdfPreviewProgressStore';
import type { DriveNodeScope } from '@/domains/Drive';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import {
  RESOURCE_VIEWER,
  resolveResourceKind,
  resolveResourceViewer,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';
import { buildWorkspaceResourcePath } from '@/utils/navigation/workspaceRoute';
import { startTransition, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface OpenInWorkspaceTarget {
  resourceId: string;
  resourceType?: string;
  resourceName?: string;
  viewer?: ResourceViewer | string;
  driveLocation:
    | { scope: DriveNodeScope }
    | {
        scope: DriveNodeScope;
        parentNodeId: string;
        nodeId?: string;
      };
  replace?: boolean;
}

export interface OpenInWorkspaceFn {
  (target: OpenInWorkspaceTarget): void;
}

const appendPdfPreviewProgress = (path: string, resourceId: string, viewer?: ResourceViewer) => {
  if (viewer !== RESOURCE_VIEWER.PDF_PREVIEW) return path;

  const progress = usePdfPreviewProgressStore.getState().progressByResourceId[resourceId];
  if (progress == null) return path;

  const [pathname, search = ''] = path.split('?');
  const qs = new URLSearchParams(search);
  qs.set('page', String(progress.page));
  qs.set('zoom', progress.zoom);
  return `${pathname}?${qs.toString()}`;
};

/**
 * Workspace 资源打开入口。负责原子记录 Drive 定位、资源身份归一化、viewer 推导与 PDF 进度恢复。
 */
export const useOpenInWorkspace = (): OpenInWorkspaceFn => {
  const navigate = useNavigate();

  return useCallback(
    (target) => {
      const resourceId = target.resourceId.trim();
      if (!resourceId) return;

      const navigationStore = useWorkspaceNavigationStore.getState();
      const scope = target.driveLocation.scope;
      if ('parentNodeId' in target.driveLocation) {
        navigationStore.navigateToResource({
          scope,
          resource: {
            resourceId,
            parentNodeId: target.driveLocation.parentNodeId,
            ...(target.driveLocation.nodeId ? { nodeId: target.driveLocation.nodeId } : {}),
          },
        });
      } else {
        navigationStore.navigateToScope(scope);
      }

      const resourceType = resolveResourceKind({
        resourceType: target.resourceType,
        resourceName: target.resourceName,
      });
      const viewer = resolveResourceViewer({
        resourceType: target.resourceType ?? resourceType,
        resourceName: target.resourceName,
        viewer: target.viewer,
      });
      const basePath = buildWorkspaceResourcePath({ resourceType, resourceId, viewer });
      const path = appendPdfPreviewProgress(basePath, resourceId, viewer);

      startTransition(() => {
        navigate(path, { replace: target.replace });
      });
    },
    [navigate]
  );
};
