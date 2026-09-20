import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import ResourceWorkspace from '../_components/ResourceWorkspace';
import AgentWorkspace from './_components/AgentWorkspace';
import { useAgentVersionController } from './controllers/useAgentVersionController';
import styles from './style.module.less';

interface AgentViewProps {
  resourceId: string;
}

export default function AgentView({ resourceId }: AgentViewProps) {
  const { t } = useTranslation(['agent', 'common']);
  const version = useAgentVersionController({ resourceId });

  if (version.error) {
    return (
      <ResourceWorkspace className={styles.pageWrap}>
        <div className={styles.overlay}>
          <ResultState
            status="warning"
            title={t('agent:page.openFailed')}
            subTitle={parseErrorMessage(version.error)}
            extra={
              <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                <AppButton variant="secondary">{t('agent:page.backToDrive')}</AppButton>
              </Link>
            }
          />
        </div>
      </ResourceWorkspace>
    );
  }

  if (!version.data || !version.displayAgent) {
    return (
      <ResourceWorkspace className={styles.pageWrap}>
        <div className={styles.overlay} aria-busy="true" aria-live="polite">
          <Spin size="large" />
          <span>{t('agent:page.loading')}</span>
        </div>
      </ResourceWorkspace>
    );
  }

  return (
    <AgentWorkspace
      key={`${resourceId}:${version.sourceRevision}`}
      agent={version.displayAgent}
      data={version.data}
      disabledVersionKeys={version.disabledVersionKeys}
      isOwner={version.isOwner}
      resourceId={resourceId}
      versionItems={version.versionItems}
      versionLoading={version.versionLoading}
      viewingVersion={version.viewingVersion}
      onRefresh={version.refresh}
      onVersionSelect={version.selectVersion}
    />
  );
}
