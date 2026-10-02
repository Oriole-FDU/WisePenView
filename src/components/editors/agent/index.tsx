import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import EditorPresentationBinding from '@/components/editors/_runtime/EditorPresentationBinding';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { EditorSurfaceProvider, useEditorSurface } from '../_context';
import { useEditorLoadState } from '../_runtime/useEditorRuntime';
import type { EditorSurfaceProps } from '../editor.type';
import AgentWorkspace from './components/AgentWorkspace';
import { useAgentVersionController } from './controllers/useAgentVersionController';
import styles from './style.module.less';

function AgentEditorContent() {
  const {
    target: { resourceId },
  } = useEditorSurface();
  const { t } = useTranslation(['agent', 'common']);
  const version = useAgentVersionController({ resourceId });

  useEditorLoadState({ error: version.error, loading: version.loading && !version.displayAgent });

  if (version.error && !version.displayAgent) {
    return (
      <>
        <EditorPresentationBinding className={styles.pageWrap} />
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
      </>
    );
  }

  if (!version.data || !version.displayAgent) {
    return (
      <>
        <EditorPresentationBinding className={styles.pageWrap} />
        <div className={styles.overlay} aria-busy="true" aria-live="polite">
          <Spin size="large" />
          <span>{t('agent:page.loading')}</span>
        </div>
      </>
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

export default function AgentEditor(props: EditorSurfaceProps) {
  return (
    <EditorSurfaceProvider {...props} kind="agent">
      <AgentEditorContent />
    </EditorSurfaceProvider>
  );
}
