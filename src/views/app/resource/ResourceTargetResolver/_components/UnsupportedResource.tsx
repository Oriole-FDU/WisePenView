import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { ResultState } from '@/components/base/Feedback';
import { ResourceLayout } from '@/layouts/Resource/ResourceLayout';

import type { UnsupportedResourceProps } from '../index.type';
import styles from '../style.module.less';

export default function UnsupportedResource({
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
    <ResourceLayout header={false}>
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
    </ResourceLayout>
  );
}
