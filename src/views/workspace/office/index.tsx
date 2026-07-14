import { ONLYOFFICE_DOCUMENT_SERVER_PUBLIC_URL } from '@/apis/clientUrls';
import { ResultState, Spin } from '@/components/Feedback';
import { useDocumentService, useResourceService } from '@/domains';
import type { ResourceAction } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  DEFAULT_RESOURCE_HOST_ID,
  useResourceHostId,
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import type { Config } from '@onlyoffice/doceditor-types';
import { DocumentEditor } from '@onlyoffice/document-editor-react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ResourceFavoriteButton from '../_common/ResourceFavoriteButton';
import styles from './style.module.less';

interface OfficeLayoutConfigProps {
  children: ReactNode;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  resourceInfoActions?: ResourceAction[] | null;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
  actions?: ReactNode;
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
  resourceId,
  resourceName,
  resourceType,
  resourceInfoActions,
  ownerId,
  onPermissionSuccess,
  actions,
}: OfficeLayoutConfigProps) {
  const frameConfig = useMemo<ResourceHostLayoutConfig>(
    () => ({
      className: styles.container,
      header: resourceName
        ? {
            resource: {
              resourceId,
              resourceName,
              resourceType,
              currentActions: resourceInfoActions,
              permissionResourceType: RESOURCE_KIND.FILE,
              ownerId,
              onPermissionSuccess,
              actions,
            },
          }
        : {},
    }),
    [
      actions,
      onPermissionSuccess,
      ownerId,
      resourceId,
      resourceInfoActions,
      resourceName,
      resourceType,
    ]
  );
  useResourceHostLayoutConfig(frameConfig);

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
  const containerId = useMemo(() => {
    const safeResourceId = resourceId.replace(/[^a-z0-9_-]/gi, '-');
    if (hostId === DEFAULT_RESOURCE_HOST_ID) return `onlyoffice-editor-${safeResourceId}`;
    const safeHostId = hostId.replace(/[^a-z0-9_-]/gi, '-');
    return `onlyoffice-editor-${safeHostId}-${safeResourceId}`;
  }, [hostId, resourceId]);

  return (
    <div className={styles.editorHost}>
      <DocumentEditor
        id={containerId}
        documentServerUrl={documentServerUrl}
        config={config}
        width="100%"
        height="100%"
        events_onDocumentReady={onReady}
        events_onError={(event) => onError(event)}
        onLoadComponentError={(errorCode, errorDescription) => {
          onError(new Error(`${errorDescription || 'ONLYOFFICE 组件加载失败'} (${errorCode})`));
        }}
      />
    </div>
  );
}

function OfficeView({ resourceId }: OfficeViewProps = {}) {
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const [editorReady, setEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<unknown>(null);

  const {
    data,
    error,
    loading: isConfigLoading,
    refresh: refreshOfficeData,
  } = useRequest(
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

  useRequest(() => resourceService.interactRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
    setEditorError(null);
  }, []);

  const handleEditorError = useCallback((nextError: unknown) => {
    setEditorError(nextError);
    setEditorReady(false);
  }, []);

  if (!resourceId) {
    return (
      <OfficeLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开 Office 文档"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
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
              title="ONLYOFFICE 编辑器加载失败"
              subTitle={parseErrorMessage(error)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
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
            <span className={styles.middleOverlayText}>正在加载 Office 文档...</span>
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
            <ResultState status="warning" title="ONLYOFFICE 编辑器配置为空" />
          </div>
        </div>
      </OfficeLayoutConfig>
    );
  }

  const resourceName = data.docInfo.resourceInfo.resourceName;
  const resourceType = data.docInfo.resourceInfo.resourceType;

  return (
    <OfficeLayoutConfig
      resourceId={data.docInfo.resourceInfo.resourceId || resourceId}
      resourceName={resourceName}
      resourceType={resourceType}
      resourceInfoActions={data.docInfo.resourceInfo.currentActions}
      ownerId={data.docInfo.resourceInfo.ownerId}
      onPermissionSuccess={refreshOfficeData}
      actions={
        <ResourceFavoriteButton
          resourceId={data.docInfo.resourceInfo.resourceId || resourceId}
          onSuccess={refreshOfficeData}
        />
      }
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
                  title="ONLYOFFICE 编辑器加载失败"
                  subTitle={parseErrorMessage(editorError)}
                />
              </div>
            ) : (
              <div className={styles.middleOverlayLoading}>
                <Spin size="large" />
                <span className={styles.middleOverlayText}>正在启动 ONLYOFFICE 编辑器...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </OfficeLayoutConfig>
  );
}

export default OfficeView;
