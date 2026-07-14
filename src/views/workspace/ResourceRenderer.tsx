import { ResultState, Spin } from '@/components/Feedback';
import { useDocumentService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import {
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  isResourceViewerCompatible,
  normalizeResourceKind,
  normalizeResourceViewer,
  resolveResourceViewer,
  type ResourceTarget,
  type ResourceViewer,
} from '@/utils/navigation/resourceTarget';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { lazy } from 'react';
import { useResourceHostLayoutConfig, type ResourceHostLayoutConfig } from './ResourceHostContext';
import styles from './ResourceRenderer.module.less';

const DrawioView = lazy(() => import('./drawio'));
const NoteView = lazy(() => import('./note'));
const OfficeView = lazy(() => import('./office'));
const DocumentPreview = lazy(() => import('./pdf'));
const SkillView = lazy(() => import('./skill'));

interface ResourceRendererProps {
  target: ResourceTarget;
  onTargetChange: (target: ResourceTarget) => void;
  onClose: () => void;
}

interface UnsupportedResourceProps extends ResourceTarget {
  message?: string;
  onClose: () => void;
}

const HEADERLESS_LAYOUT_CONFIG: ResourceHostLayoutConfig = { header: false };

function UnsupportedResource({
  resourceType,
  resourceId,
  viewer,
  message,
  onClose,
}: UnsupportedResourceProps) {
  useResourceHostLayoutConfig(HEADERLESS_LAYOUT_CONFIG);

  const readableType = resourceType ? `资源类型：${resourceType}` : undefined;
  const readableViewer = viewer ? `打开方式：${viewer}` : undefined;
  const subTitle = message ?? [readableType, readableViewer].filter(Boolean).join('，');

  return (
    <div className={styles.middleOverlay}>
      <div className={styles.middleOverlayInner}>
        <ResultState
          status="warning"
          title={resourceId ? '暂不支持打开该资源' : '无法打开资源'}
          subTitle={subTitle || undefined}
          extra={
            <Button variant="secondary" onPress={onClose}>
              关闭资源
            </Button>
          }
        />
      </div>
    </div>
  );
}

function FileViewerResolver({ target, onTargetChange, onClose }: ResourceRendererProps) {
  const documentService = useDocumentService();
  useResourceHostLayoutConfig(HEADERLESS_LAYOUT_CONFIG);

  const { resourceId = '' } = target;
  const {
    data: docInfo,
    error,
    loading,
  } = useRequest(async () => documentService.getDocInfo(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
    onSuccess: (data) => {
      const viewer = resolveResourceViewer({
        resourceType: RESOURCE_KIND.FILE,
        resourceName: data.resourceInfo.resourceName,
      });
      if (!viewer) return;
      onTargetChange({
        ...target,
        resourceName: target.resourceName ?? data.resourceInfo.resourceName,
        viewer,
      });
    },
  });

  if (error) {
    return (
      <UnsupportedResource
        {...target}
        resourceType={RESOURCE_KIND.FILE}
        message={parseErrorMessage(error)}
        onClose={onClose}
      />
    );
  }

  if (loading || !docInfo) {
    return (
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>正在解析文件打开方式...</span>
        </div>
      </div>
    );
  }

  return (
    <UnsupportedResource
      {...target}
      resourceType={RESOURCE_KIND.FILE}
      message="无法从文件信息判断打开方式"
      onClose={onClose}
    />
  );
}

function renderResource(
  resourceType: string,
  viewer: ResourceViewer | undefined,
  resourceId: string
) {
  if (resourceType === RESOURCE_KIND.NOTE) {
    return <NoteView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.DRAWIO) {
    return <DrawioView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.SKILL) {
    return <SkillView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.FILE && viewer === RESOURCE_VIEWER.PDF_PREVIEW) {
    return <DocumentPreview resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.FILE && viewer === RESOURCE_VIEWER.OFFICE) {
    return <OfficeView resourceId={resourceId} />;
  }
  return null;
}

function ResourceRenderer({ target, onTargetChange, onClose }: ResourceRendererProps) {
  const { resourceId, resourceType: rawResourceType, viewer: rawViewer } = target;
  const resourceType = normalizeResourceKind(rawResourceType);
  const explicitViewer = normalizeResourceViewer(rawViewer);
  const viewer = resolveResourceViewer({ resourceType: rawResourceType, viewer: rawViewer });

  if (rawViewer && !explicitViewer) {
    return <UnsupportedResource {...target} onClose={onClose} />;
  }
  if (!resourceType) {
    return <UnsupportedResource {...target} onClose={onClose} />;
  }
  if (resourceType === RESOURCE_KIND.SKILL && !resourceId) {
    return <SkillView />;
  }
  if (!resourceId) {
    return <UnsupportedResource {...target} onClose={onClose} />;
  }
  if (!isResourceViewerCompatible(resourceType, viewer)) {
    return (
      <UnsupportedResource
        {...target}
        resourceType={resourceType}
        viewer={viewer}
        onClose={onClose}
      />
    );
  }
  if (resourceType === RESOURCE_KIND.FILE && !viewer) {
    return <FileViewerResolver target={target} onTargetChange={onTargetChange} onClose={onClose} />;
  }

  return (
    renderResource(resourceType, viewer, resourceId) ?? (
      <UnsupportedResource
        {...target}
        resourceType={resourceType}
        viewer={viewer}
        onClose={onClose}
      />
    )
  );
}

export default ResourceRenderer;
