import { FilePenLine } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import PdfViewer from '@/components/business/PdfViewer/index';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  type ResourceViewer,
} from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import ResourceWorkspace, { type ResourceWorkspaceProps } from '../_components/ResourceWorkspace';
import { useDocumentViewerSwitcher } from '../_hooks/useDocumentViewerSwitcher';
import styles from './style.module.less';

interface PdfWorkspaceProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
  onViewerSwitch?: (viewer: ResourceViewer) => void;
}

function PdfWorkspace({
  children,
  resourceInfo,
  documentType,
  onPermissionSuccess,
  onResourceChanged,
  onViewerSwitch,
}: PdfWorkspaceProps) {
  const { t } = useTranslation('workspace');
  const frameConfig = {
    className: styles.container,
    sidePanel: resourceInfo ? { resource: resourceInfo, onResourceChanged } : undefined,
    header: resourceInfo
      ? {
          resource: {
            resourceId: resourceInfo.resourceId,
            resourceName: resourceInfo.resourceName,
            resourceType: resourceInfo.resourceType,
            resourceInfo,
            currentActions: resourceInfo.currentActions,
            permissionResourceType: RESOURCE_KIND.FILE,
            ownerId: resourceInfo.ownerId,
            onPermissionSuccess,
            moreMenu: isOfficeResourceType(documentType)
              ? {
                  actions: [
                    {
                      id: 'open-with-office',
                      label: t('pdf.openWithOffice'),
                      icon: FilePenLine,
                      onAction: () => onViewerSwitch?.(RESOURCE_VIEWER.OFFICE),
                    },
                  ],
                }
              : undefined,
          },
        }
      : {},
  } satisfies Omit<ResourceWorkspaceProps, 'children'>;
  return <ResourceWorkspace {...frameConfig}>{children}</ResourceWorkspace>;
}

interface PdfViewProps {
  resourceId?: string;
}

function PdfView({ resourceId }: PdfViewProps = {}) {
  const { t } = useTranslation('workspace');
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const interactService = useInteractService();
  const switchViewer = useDocumentViewerSwitcher(resourceId);
  const {
    data: docInfo,
    error: docInfoError,
    loading: isDocInfoLoading,
    refresh: refreshDocInfo,
  } = useApi(
    async () => {
      const info = await documentService.getDocInfo(resourceId as string);
      if (import.meta.env.MODE === 'mock') {
        const { MOCK_PDF_PREVIEW_URL } = await import('./mock/pdfPreview');
        return { ...info, previewUrl: MOCK_PDF_PREVIEW_URL };
      }
      return info;
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  // 进入页面时上报阅读
  useApi(() => interactService.recordResourceRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const currentResourceId = resourceId ?? '';
  const viewerError = viewerErrorMap[currentResourceId];
  const handleViewerLoadError = (error: unknown) => {
    if (!currentResourceId) {
      return;
    }
    setViewerErrorMap((prev) => ({
      ...prev,
      [currentResourceId]: error,
    }));
  };

  if (!resourceId) {
    return (
      <PdfWorkspace>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('pdf.cannotOpen')}
              extra={
                <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                  <AppButton variant="secondary">{t('viewer.backToDrive')}</AppButton>
                </Link>
              }
            />
          </div>
        </div>
      </PdfWorkspace>
    );
  }

  if (docInfoError) {
    return (
      <PdfWorkspace>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('pdf.cannotOpen')}
              subTitle={parseErrorMessage(docInfoError)}
              extra={
                <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                  <AppButton variant="secondary">{t('viewer.backToDrive')}</AppButton>
                </Link>
              }
            />
          </div>
        </div>
      </PdfWorkspace>
    );
  }

  // 仅在初次加载（尚无数据）时展示全页 spinner；refresh 时保留旧 docInfo，不触发全页 loading
  if (isDocInfoLoading && !docInfo) {
    return (
      <PdfWorkspace>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('pdf.loadingInfo')}</span>
          </div>
        </div>
      </PdfWorkspace>
    );
  }

  if (!docInfo) {
    return (
      <PdfWorkspace>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('pdf.cannotOpen')}
              subTitle={t('pdf.emptyInfo')}
              extra={
                <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                  <AppButton variant="secondary">{t('viewer.backToDrive')}</AppButton>
                </Link>
              }
            />
          </div>
        </div>
      </PdfWorkspace>
    );
  }

  return (
    <PdfWorkspace
      resourceInfo={docInfo.resourceInfo}
      documentType={docInfo.docMetaInfo.uploadMeta.fileType}
      onPermissionSuccess={refreshDocInfo}
      onResourceChanged={refreshDocInfo}
      onViewerSwitch={switchViewer}
    >
      <div className={styles.content}>
        <div className={styles.root}>
          {viewerError ? (
            <div className={styles.viewerFailure}>
              <ResultState
                status="warning"
                title={t('pdf.previewFailed')}
                subTitle={parseErrorMessage(viewerError)}
                extra={
                  <AppButton
                    variant="secondary"
                    onPress={() =>
                      setViewerErrorMap((current) => ({
                        ...current,
                        [currentResourceId]: undefined,
                      }))
                    }
                  >
                    {t('pdf.retryPreview')}
                  </AppButton>
                }
              />
            </div>
          ) : (
            <PdfViewer
              key={resourceId}
              className={styles.viewer}
              resourceId={resourceId}
              sourceUrl={docInfo.previewUrl}
              onLoadError={handleViewerLoadError}
            />
          )}
        </div>
      </div>
    </PdfWorkspace>
  );
}

export default PdfView;
