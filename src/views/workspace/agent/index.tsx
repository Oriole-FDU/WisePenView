import { ResultState, Spin } from '@/components/Feedback';
import { parseErrorMessage } from '@/utils/error';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ResourceLayoutConfig from '../_components/ResourceLayoutConfig';
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
      <ResourceLayoutConfig className={styles.pageWrap} deps={[]}>
        <div className={styles.overlay}>
          <ResultState
            status="warning"
            title={t('agent:page.openFailed')}
            subTitle={parseErrorMessage(version.error)}
            extra={
              <Link to="/app/drive/personal">
                <Button variant="secondary">{t('agent:page.backToDrive')}</Button>
              </Link>
            }
          />
        </div>
      </ResourceLayoutConfig>
    );
  }

  if (!version.data || !version.displayAgent) {
    return (
      <ResourceLayoutConfig className={styles.pageWrap} deps={[]}>
        <div className={styles.overlay} aria-busy="true" aria-live="polite">
          <Spin size="large" />
          <span>{t('agent:page.loading')}</span>
        </div>
      </ResourceLayoutConfig>
    );
  }

  return (
    <AgentWorkspace
      key={`${resourceId}:${version.sourceRevision}`}
      agent={version.displayAgent}
      data={version.data}
      disabledVersionKeys={version.disabledVersionKeys}
      resourceId={resourceId}
      versionItems={version.versionItems}
      versionLoading={version.versionLoading}
      viewingVersion={version.viewingVersion}
      onRefresh={version.refresh}
      onVersionSelect={version.selectVersion}
    />
  );
}
