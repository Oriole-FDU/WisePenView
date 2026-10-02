import { useTranslation } from 'react-i18next';

import { Spin } from '@/components/base/Feedback';
import { useDocumentService } from '@/domains';
import { resolveResourceViewer, RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { ResourceLayout } from '@/layouts/Resource/ResourceLayout';
import { parseErrorMessage } from '@/utils/error';

import type { ResourceTargetResolverProps } from '../index.type';
import styles from '../style.module.less';
import UnsupportedResource from './UnsupportedResource';

export default function FileViewerResolver({
  target,
  onTargetChange,
  onClose,
}: ResourceTargetResolverProps) {
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
      <ResourceLayout header={false}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('renderer.resolving')}</span>
          </div>
        </div>
      </ResourceLayout>
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
