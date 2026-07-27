import { ResultState, Spin } from '@/components/Feedback';
import PdfViewer from '@/components/PdfViewer/index';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';
import { useResourceHostLayoutConfig } from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { FilePenLine } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDocumentViewerSwitcher } from '../_hooks/useDocumentViewerSwitcher';
import styles from './style.module.less';

interface PdfLayoutConfigProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
  onViewerSwitch?: (viewer: ResourceViewer) => void;
}

function PdfLayoutConfig({
  children,
  resourceInfo,
  documentType,
  onPermissionSuccess,
  onResourceChanged,
  onViewerSwitch,
}: PdfLayoutConfigProps) {
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
  };
  useResourceHostLayoutConfig(
    () => frameConfig,
    [documentType, onPermissionSuccess, onResourceChanged, onViewerSwitch, resourceInfo, t]
  );

  return <>{children}</>;
}

interface DocumentPreviewProps {
  resourceId?: string;
}

function DocumentPreview({ resourceId }: DocumentPreviewProps = {}) {
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
  } = useRequest(
    async () => {
      return await documentService.getDocInfo(resourceId as string);
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  // 进入页面时上报阅读
  useRequest(() => interactService.recordResourceRead(resourceId as string), {
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
      <PdfLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('pdf.cannotOpen')}
              extra={
                <Link to="/app/drive/personal">
                  <Button variant="secondary">{t('viewer.backToDrive')}</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  if (docInfoError) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('pdf.cannotOpen')}
              subTitle={parseErrorMessage(docInfoError)}
              extra={
                <Link to="/app/drive/personal">
                  <Button variant="secondary">{t('viewer.backToDrive')}</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  // 仅在初次加载（尚无数据）时展示全页 spinner；refresh 时保留旧 docInfo，不触发全页 loading
  if (isDocInfoLoading && !docInfo) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('pdf.loadingInfo')}</span>
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  if (!docInfo) {
    return (
      <PdfLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('pdf.cannotOpen')}
              subTitle={t('pdf.emptyInfo')}
              extra={
                <Link to="/app/drive/personal">
                  <Button variant="secondary">{t('viewer.backToDrive')}</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  return (
    <PdfLayoutConfig
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
                  <Button
                    variant="secondary"
                    onPress={() =>
                      setViewerErrorMap((current) => ({
                        ...current,
                        [currentResourceId]: undefined,
                      }))
                    }
                  >
                    {t('pdf.retryPreview')}
                  </Button>
                }
              />
            </div>
          ) : (
            <PdfViewer
              key={resourceId}
              className={styles.viewer}
              resourceId={resourceId}
              onLoadError={handleViewerLoadError}
            />
          )}
        </div>
      </div>
    </PdfLayoutConfig>
  );
}

export default DocumentPreview;
