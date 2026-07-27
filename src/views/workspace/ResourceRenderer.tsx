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
import { useTranslation } from 'react-i18next';
import { useResourceHostLayoutConfig, type ResourceHostLayoutConfig } from './ResourceHostContext';
import styles from './ResourceRenderer.module.less';

const AgentView = lazy(() => import('./agent'));
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
  const { t } = useTranslation('workspace');
  useResourceHostLayoutConfig(() => HEADERLESS_LAYOUT_CONFIG, []);

  const readableType = resourceType
    ? t('renderer.resourceType', { type: resourceType })
    : undefined;
  const readableViewer = viewer ? t('renderer.viewer', { viewer }) : undefined;
  const subTitle = message ?? [readableType, readableViewer].filter(Boolean).join('，');

  return (
    <div className={styles.middleOverlay}>
      <div className={styles.middleOverlayInner}>
        <ResultState
          status="warning"
          title={resourceId ? t('renderer.unsupported') : t('renderer.cannotOpen')}
          subTitle={subTitle || undefined}
          extra={
            <Button variant="secondary" onPress={onClose}>
              {t('renderer.close')}
            </Button>
          }
        />
      </div>
    </div>
  );
}

function FileViewerResolver({ target, onTargetChange, onClose }: ResourceRendererProps) {
  const { t } = useTranslation('workspace');
  const documentService = useDocumentService();
  useResourceHostLayoutConfig(() => HEADERLESS_LAYOUT_CONFIG, []);

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
        resourceType: data.resourceInfo.resourceType,
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
          <span className={styles.middleOverlayText}>{t('renderer.resolving')}</span>
        </div>
      </div>
    );
  }

  return (
    <UnsupportedResource
      {...target}
      resourceType={RESOURCE_KIND.FILE}
      message={t('renderer.unresolved')}
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
  if (resourceType === RESOURCE_KIND.AGENT) {
    return <AgentView resourceId={resourceId} />;
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
  if (resourceType === RESOURCE_KIND.AGENT && !resourceId) {
    return <AgentView />;
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
