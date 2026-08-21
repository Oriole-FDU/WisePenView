import { AppButton } from '@/components/Button';
import { ResultState, Spin } from '@/components/Feedback';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { useApi } from '@/hooks/useApi';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';
import {
  DEFAULT_RESOURCE_HOST_ID,
  useResourceHostId,
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/resource/ResourceHostContext';

import type { Config } from '@onlyoffice/doceditor-types';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useMemoizedFn } from 'ahooks';
import { FileText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDocumentViewerSwitcher } from '../_hooks/useDocumentViewerSwitcher';
import styles from './style.module.less';

const ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL = import.meta.env
  .VITE_ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL;

interface OfficeLayoutConfigProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
  onViewerSwitch?: (viewer: ResourceViewer) => void;
}

interface OfficeEditorHostProps {
  config: Config;
  documentServerUrl: string;
  resourceId: string;
  onReady: () => void;
  onError: (error: unknown) => void;
}

interface OfficeViewProps {
  resourceId?: string;
}

function OfficeLayoutConfig({
  children,
  resourceInfo,
  documentType,
  onPermissionSuccess,
  onResourceChanged,
  onViewerSwitch,
}: OfficeLayoutConfigProps) {
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
                      id: 'open-with-pdf-preview',
                      label: t('office.openWithPdf'),
                      icon: FileText,
                      onAction: () => onViewerSwitch?.(RESOURCE_VIEWER.PDF_PREVIEW),
                    },
                  ],
                }
              : undefined,
          },
        }
      : {},
  } satisfies ResourceHostLayoutConfig;
  useResourceHostLayoutConfig(
    () => frameConfig,
    [documentType, onPermissionSuccess, onResourceChanged, onViewerSwitch, resourceInfo, t]
  );

  return <>{children}</>;
}

function OfficeEditorHost({
  config,
  documentServerUrl,
  resourceId,
  onReady,
  onError,
}: OfficeEditorHostProps) {
  const hostId = useResourceHostId();
  const containerId = (() => {
    const safeResourceId = resourceId.replace(/[^a-z0-9_-]/gi, '-');
    if (hostId === DEFAULT_RESOURCE_HOST_ID) return `onlyoffice-editor-${safeResourceId}`;
    const safeHostId = hostId.replace(/[^a-z0-9_-]/gi, '-');
    return `onlyoffice-editor-${safeHostId}-${safeResourceId}`;
  })();

  return (
    <div className={styles.editorHost}>
      <DocumentEditor
        id={containerId}
        documentServerUrl={documentServerUrl}
        config={config}
        width="100%"
        height="100%"
        events_onDocumentReady={onReady}
        events_onError={(event) =>
          onError(
            createClientError(
              FRONTEND_CLIENT_ERROR.OFFICE_LOAD_FAILED,
              { errorCode: 'unknown' },
              event
            )
          )
        }
        onLoadComponentError={(errorCode, errorDescription) => {
          onError(
            createClientError(FRONTEND_CLIENT_ERROR.OFFICE_LOAD_FAILED, {
              errorCode,
              errorDescription,
            })
          );
        }}
      />
    </div>
  );
}

function OfficeView({ resourceId }: OfficeViewProps = {}) {
  const { t } = useTranslation('workspace');
  const documentService = useDocumentService();
  const interactService = useInteractService();
  const switchViewer = useDocumentViewerSwitcher(resourceId);
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<unknown>(null);

  const {
    data,
    error,
    loading: isConfigLoading,
    mutate: mutateOfficeData,
    refresh: refreshOfficeData,
  } = useApi(
    async () => {
      const [docInfo, editorConfig] = await Promise.all([
        documentService.getDocInfo(resourceId as string),
        documentService.getOnlyOfficeEditorConfig(resourceId as string),
      ]);
      return { docInfo, editorConfig };
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
      onBefore: () => {
        setEditorReady(false);
        setEditorError(null);
      },
    }
  );

  useApi(() => interactService.recordResourceRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const handleEditorReady = () => {
    setEditorReady(true);
    setEditorError(null);
  };

  const handleEditorError = (nextError: unknown) => {
    setEditorError(nextError);
    setEditorReady(false);
  };

  // 宿主布局依赖稳定函数身份，同时刷新时需要读取最新的文档数据。
  const refreshResourceInfo = useMemoizedFn(async () => {
    const docInfo = await documentService.getDocInfo(resourceId as string);
    if (data) mutateOfficeData({ ...data, docInfo });
  });

  if (!resourceId) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('office.cannotOpen')}
              extra={
                <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                  <AppButton variant="secondary">{t('viewer.backToDrive')}</AppButton>
                </Link>
              }
            />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  if (error) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title={t('office.loadFailed')}
              subTitle={parseErrorMessage(error)}
              extra={
                <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                  <AppButton variant="secondary">{t('viewer.backToDrive')}</AppButton>
                </Link>
              }
            />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  if (isConfigLoading && !data) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('office.loading')}</span>
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  if (!data?.editorConfig.config) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState status="warning" title={t('office.emptyConfig')} />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  return (
    <OfficeLayoutConfig
      resourceInfo={data.docInfo.resourceInfo}
      documentType={data.docInfo.docMetaInfo.uploadMeta.fileType}
      onPermissionSuccess={refreshOfficeData}
      onResourceChanged={refreshResourceInfo}
      onViewerSwitch={switchViewer}
    >
      <div className={styles.content}>
        <OfficeEditorHost
          key={`${resourceId}-${data.editorConfig.sessionId ?? 'session'}`}
          config={data.editorConfig.config}
          documentServerUrl={ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL}
          resourceId={resourceId}
          onReady={handleEditorReady}
          onError={handleEditorError}
        />
        {(!editorReady || Boolean(editorError)) && (
          <div className={styles.loadingOverlay} aria-busy={!editorError} aria-live="polite">
            {editorError ? (
              <div className={styles.middleOverlayInner}>
                <ResultState
                  status="warning"
                  title={t('office.loadFailed')}
                  subTitle={parseErrorMessage(editorError)}
                />
              </div>
            ) : (
              <div className={styles.middleOverlayLoading}>
                <Spin size="large" />
                <span className={styles.middleOverlayText}>{t('office.starting')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </OfficeLayoutConfig>
  );
}

export default OfficeView;
