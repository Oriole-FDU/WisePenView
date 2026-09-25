import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import { useDocumentService } from '@/domains';
import {
  isResourceViewerCompatible,
  normalizeResourceKind,
  normalizeResourceViewer,
  resolveResourceViewer,
  RESOURCE_KIND,
  type ResourceTarget,
} from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import ResourceWorkspace from './_components/ResourceWorkspace';
import ResourceRenderer, { type ResolvedResourceTarget } from './ResourceRenderer';
import styles from './ResourceTargetResolver.module.less';

interface ResourceTargetResolverProps {
  target: ResourceTarget;
  onTargetChange: (target: ResourceTarget) => void;
  onClose: () => void;
}

interface UnsupportedResourceProps extends ResourceTarget {
  message?: string;
  onClose: () => void;
}

function UnsupportedResource({
  resourceType,
  resourceId,
  viewer,
  message,
  onClose,
}: UnsupportedResourceProps) {
  const { t } = useTranslation('workspace');

  const readableType = resourceType
    ? t('renderer.resourceType', { type: resourceType })
    : undefined;
  const readableViewer = viewer ? t('renderer.viewer', { viewer }) : undefined;
  const subTitle = message ?? [readableType, readableViewer].filter(Boolean).join('，');

  return (
    <ResourceWorkspace header={false}>
      <div className={styles.middleOverlay}>
        <div className={styles.middleOverlayInner}>
          <ResultState
            status="warning"
            title={resourceId ? t('renderer.unsupported') : t('renderer.cannotOpen')}
            subTitle={subTitle || undefined}
            extra={
              <AppButton variant="secondary" onPress={onClose}>
                {t('renderer.close')}
              </AppButton>
            }
          />
        </div>
      </div>
    </ResourceWorkspace>
  );
}

function FileViewerResolver({ target, onTargetChange, onClose }: ResourceTargetResolverProps) {
  const { t } = useTranslation('workspace');
  const documentService = useDocumentService();

  const { resourceId = '' } = target;
  const {
    data: docInfo,
    error,
    loading,
  } = useApi(async () => documentService.getDocInfo(resourceId), {
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
      <ResourceWorkspace header={false}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('renderer.resolving')}</span>
          </div>
        </div>
      </ResourceWorkspace>
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

function ResourceTargetResolver({ target, onTargetChange, onClose }: ResourceTargetResolverProps) {
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

  if (!viewer) {
    return <UnsupportedResource {...target} resourceType={resourceType} onClose={onClose} />;
  }

  const resolvedTarget: ResolvedResourceTarget = {
    resourceId,
    resourceType,
    resourceName: target.resourceName,
    viewer,
  };

  return <ResourceRenderer target={resolvedTarget} />;
}

export default ResourceTargetResolver;
