import { useMemoizedFn } from 'ahooks';
import { startTransition } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePdfPreviewProgressStore } from '@/components/business/PdfViewer/_store/usePdfPreviewProgressStore';
import type { DriveResourceLocation } from '@/domains/Drive';
import { buildResourcePath } from '@/utils/navigation/resourceRoute';
import {
  resolveResourceKind,
  resolveResourceViewer,
  RESOURCE_VIEWER,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';

export interface OpenResourceNavigationTarget {
  resourceId: string;
  resourceType?: string;
  resourceName?: string;
  viewer?: ResourceViewer | string;
  driveLocation?: DriveResourceLocation;
  replace?: boolean;
}

export interface OpenResourceNavigationFn {
  (target: OpenResourceNavigationTarget): void;
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
 * 资源打开入口。负责原子记录 Drive 定位、资源身份归一化、viewer 推导与 PDF 进度恢复。
 */
export const useOpenResource = (): OpenResourceNavigationFn => {
  const navigate = useNavigate();

  return useMemoizedFn((target) => {
    const resourceId = target.resourceId.trim();
    if (!resourceId) return;

    const resourceType = resolveResourceKind(target.resourceType);
    const viewer = resolveResourceViewer({
      resourceType: target.resourceType ?? resourceType,
      viewer: target.viewer,
    });
    const basePath = buildResourcePath({
      resourceType,
      resourceId,
      viewer,
      driveLocation: target.driveLocation,
    });
    const path = appendPdfPreviewProgress(basePath, resourceId, viewer);

    startTransition(() => {
      navigate(path, { replace: target.replace });
    });
  });
};
