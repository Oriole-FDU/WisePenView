import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import EditorWorkspace from '@/components/editors/EditorWorkspace';
import PdfViewer from '@/components/editors/pdf/components/PdfViewer/index';
import { publicAppConfig } from '@/config/runtimeConfig';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { EditorSurfaceProvider, useEditorSurface } from '../_context';
import type { EditorSurfaceProps } from '../editor.type';
import { useEditorRuntime } from '../runtime/useEditorRuntime';
import styles from './style.module.less';

interface PdfWorkspaceProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

function PdfWorkspace({
  children,
  resourceInfo,
  documentType,
  onPermissionSuccess,
  onResourceChanged,
}: PdfWorkspaceProps) {
  return (
    <EditorWorkspace
      className={styles.container}
      document={{ resourceInfo, documentType, onPermissionSuccess, onResourceChanged }}
    >
      {children}
    </EditorWorkspace>
  );
}

function PdfEditorContent() {
  const {
    target: { resourceId },
  } = useEditorSurface();
  const { t } = useTranslation('workspace');
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const interactService = useInteractService();
  const {
    data: docInfo,
    error: docInfoError,
    loading: isDocInfoLoading,
    refresh: refreshDocInfo,
  } = useApi(
    async () => {
      const info = await documentService.getDocInfo(resourceId as string);
      if (publicAppConfig.mode === 'mock') {
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

  useEditorRuntime({
    loading: isDocInfoLoading && !docInfo,
    error: docInfoError,
    readOnly: true,
    openedResource: {
      ...useEditorSurface().target,
      resourceName: docInfo?.resourceInfo.resourceName,
    },
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

export default function PdfEditor(props: EditorSurfaceProps) {
  return (
    <EditorSurfaceProvider {...props} kind="pdf">
      <PdfEditorContent />
    </EditorSurfaceProvider>
  );
}
