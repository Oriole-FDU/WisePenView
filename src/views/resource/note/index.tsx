import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import { useNoteService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/resource/ResourceHostContext';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import NoteWorkspace from './_components/NoteWorkspace';
import styles from './style.module.less';

const NOTE_FRAME_CONFIG: ResourceHostLayoutConfig = { className: styles.pageWrap };

function NoteFrame({ children }: { children: ReactNode }) {
  useResourceHostLayoutConfig(() => NOTE_FRAME_CONFIG, []);
  return <>{children}</>;
}

function NoteOpenFailure({ subTitle }: { subTitle?: string }) {
  const { t } = useTranslation('note');
  return (
    <NoteFrame>
      <div className={styles.middleOverlay}>
        <div className={styles.middleOverlayInner}>
          <ResultState
            status="warning"
            title={t('workspace.openFailed')}
            subTitle={subTitle}
            extra={
              <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                <AppButton variant="secondary">{t('workspace.backToDrive')}</AppButton>
              </Link>
            }
          />
        </div>
      </div>
    </NoteFrame>
  );
}

function NoteInfoLoading() {
  const { t } = useTranslation('note');
  return (
    <NoteFrame>
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>{t('workspace.loadingInfo')}</span>
        </div>
      </div>
    </NoteFrame>
  );
}

function NoteView({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation('note');
  const noteService = useNoteService();
  const {
    data: noteInfoDisplay,
    loading,
    error,
    refresh,
  } = useApi(
    async () => {
      const info = await noteService.getNoteInfoDisplay({ resourceId });
      if (import.meta.env.MODE === 'mock') {
        const { getNotePreview } = await import('./mock/notePreview');
        return { ...info, aiDiffPreview: getNotePreview(resourceId) };
      }
      return info;
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  if (!resourceId) {
    return <NoteOpenFailure />;
  }
  if (error) {
    return <NoteOpenFailure subTitle={parseErrorMessage(error)} />;
  }
  if (loading && !noteInfoDisplay) {
    return <NoteInfoLoading />;
  }
  if (!noteInfoDisplay) {
    return <NoteOpenFailure subTitle={t('workspace.emptyInfo')} />;
  }

  return (
    <NoteWorkspace
      key={`${resourceId}:${Boolean(noteInfoDisplay.aiDiffPreview)}`}
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      onRefreshNoteInfo={refresh}
    />
  );
}

export default NoteView;
