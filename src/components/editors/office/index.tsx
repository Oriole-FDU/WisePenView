import type { Config } from '@onlyoffice/doceditor-types';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useMemoizedFn } from 'ahooks';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import EditorWorkspace from '@/components/editors/EditorWorkspace';
import { publicAppConfig } from '@/config/runtimeConfig';
import { useDocumentService, useInteractService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { useApi } from '@/hooks/useApi';
import { DEFAULT_RESOURCE_HOST_ID, useResourceHostId } from '@/layouts/Resource/_context';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { EditorSurfaceProvider, useEditorSurface } from '../_context';
import type { EditorSurfaceProps } from '../editor.type';
import styles from './style.module.less';

interface OfficeWorkspaceProps {
  children: ReactNode;
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

interface OfficeEditorHostProps {
  config: Config;
  documentServerUrl: string;
  resourceId: string;
  onReady: () => void;
  onError: (error: unknown) => void;
}

function OfficeWorkspace({
  children,
  resourceInfo,
  documentType,
  onPermissionSuccess,
  onResourceChanged,
}: OfficeWorkspaceProps) {
  return (
    <EditorWorkspace
      className={styles.container}
      document={{ resourceInfo, documentType, onPermissionSuccess, onResourceChanged }}
    >
      {children}
    </EditorWorkspace>
  );
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

function OfficeEditorContent() {
  const {
    target: { resourceId },
  } = useEditorSurface();
  const { t } = useTranslation('workspace');
  const documentService = useDocumentService();
  const interactService = useInteractService();
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

  // 刷新权限与评论数据时保留当前 Office 编辑实例。
  const refreshResourceInfo = useMemoizedFn(async () => {
    const docInfo = await documentService.getDocInfo(resourceId as string);
    if (data) mutateOfficeData({ ...data, docInfo });
  });

  if (!resourceId) {
    return (
      <OfficeWorkspace>
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
      </OfficeWorkspace>
    );
  }

  if (error) {
    return (
      <OfficeWorkspace>
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
      </OfficeWorkspace>
    );
  }

  if (isConfigLoading && !data) {
    return (
      <OfficeWorkspace>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('office.loading')}</span>
          </div>
        </div>
      </OfficeWorkspace>
    );
  }

  if (!data?.editorConfig.config) {
    return (
      <OfficeWorkspace>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState status="warning" title={t('office.emptyConfig')} />
          </div>
        </div>
      </OfficeWorkspace>
    );
  }

  return (
    <OfficeWorkspace
      resourceInfo={data.docInfo.resourceInfo}
      documentType={data.docInfo.docMetaInfo.uploadMeta.fileType}
      onPermissionSuccess={refreshOfficeData}
      onResourceChanged={refreshResourceInfo}
    >
      <div className={styles.content}>
        <OfficeEditorHost
          key={`${resourceId}-${data.editorConfig.sessionId ?? 'session'}`}
          config={data.editorConfig.config}
          documentServerUrl={publicAppConfig.office.documentServerUrl}
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
    </OfficeWorkspace>
  );
}

export default function OfficeEditor(props: EditorSurfaceProps) {
  return (
    <EditorSurfaceProvider {...props} kind="office">
      <OfficeEditorContent />
    </EditorSurfaceProvider>
  );
}
