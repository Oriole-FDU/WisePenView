import { ResultState, Spin } from '@/components/Feedback';
import ResourceDiscussionPanel from '@/components/interact/ResourceDiscussionPanel';
import PdfViewer from '@/components/PdfViewer/index';
import { useDocumentService, useResourceService } from '@/domains';
import type { ResourceAction } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button, ToggleButton, Tooltip } from '@heroui/react';
import { useRequest } from 'ahooks';
import { MessagesSquare } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ResourceFavoriteButton from '../_common/ResourceFavoriteButton';
import styles from './style.module.less';

interface PdfLayoutConfigProps {
  children: ReactNode;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  resourceInfoActions?: ResourceAction[] | null;
  ownerId?: string | null;
  onPermissionSuccess?: () => void;
  actions?: ReactNode;
}

function PdfLayoutConfig({
  children,
  resourceId,
  resourceName,
  resourceType,
  resourceInfoActions,
  ownerId,
  onPermissionSuccess,
  actions,
}: PdfLayoutConfigProps) {
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

interface DocumentPreviewProps {
  resourceId?: string;
}

function DocumentPreview({ resourceId }: DocumentPreviewProps = {}) {
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const documentService = useDocumentService();
  const resourceService = useResourceService();
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
  useRequest(() => resourceService.interactRead(resourceId as string), {
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
              title="无法打开文档"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
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
              title="无法打开文档"
              subTitle={parseErrorMessage(docInfoError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
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
            <span className={styles.middleOverlayText}>正在加载文档信息...</span>
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
              title="无法打开文档"
              subTitle="文档信息为空，请稍后重试"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </PdfLayoutConfig>
    );
  }

  const resolvedResourceId = docInfo.resourceInfo.resourceId || resourceId;
  const canShowDiscussion = docInfo.resourceInfo.resourceType === RESOURCE_KIND.FILE;
  const discussionToggleLabel = discussionOpen ? '收起讨论栏' : '展开讨论栏';
  const headerActions = (
    <div className={styles.headerActions}>
      <ResourceFavoriteButton resourceId={resolvedResourceId} onSuccess={refreshDocInfo} />
      {canShowDiscussion ? (
        <Tooltip>
          <Tooltip.Trigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isIconOnly
              isSelected={discussionOpen}
              aria-label={discussionToggleLabel}
              aria-expanded={discussionOpen}
              onChange={() => setDiscussionOpen((current) => !current)}
            >
              <MessagesSquare size={16} aria-hidden="true" />
            </ToggleButton>
          </Tooltip.Trigger>
          <Tooltip.Content>{discussionToggleLabel}</Tooltip.Content>
        </Tooltip>
      ) : null}
    </div>
  );

  if (viewerError) {
    return (
      <PdfLayoutConfig
        resourceId={resolvedResourceId}
        resourceName={docInfo.resourceInfo.resourceName}
        resourceType={docInfo.resourceInfo.resourceType}
        resourceInfoActions={docInfo.resourceInfo.currentActions}
        ownerId={docInfo.resourceInfo.ownerId}
        onPermissionSuccess={refreshDocInfo}
        actions={headerActions}
      >
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="文档预览失败"
              subTitle={parseErrorMessage(viewerError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
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
      resourceId={resolvedResourceId}
      resourceName={docInfo.resourceInfo.resourceName}
      resourceType={docInfo.resourceInfo.resourceType}
      resourceInfoActions={docInfo.resourceInfo.currentActions}
      ownerId={docInfo.resourceInfo.ownerId}
      onPermissionSuccess={refreshDocInfo}
      actions={headerActions}
    >
      <div className={styles.content}>
        <div className={styles.contentRow}>
          <div className={styles.mainPanel}>
            <div className={styles.root}>
              <PdfViewer
                key={resourceId}
                className={styles.viewer}
                resourceId={resourceId}
                onLoadError={handleViewerLoadError}
              />
            </div>
          </div>
          {discussionOpen ? (
            <aside className={styles.resourceAsidePanel} aria-label="资源讨论侧栏">
              <ResourceDiscussionPanel
                resource={docInfo.resourceInfo}
                onInteractionSuccess={refreshDocInfo}
              />
            </aside>
          ) : null}
        </div>
      </div>
    </PdfLayoutConfig>
  );
}

export default DocumentPreview;
