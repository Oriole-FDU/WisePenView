import { ResultState, Spin } from '@/components/Feedback';
import { useNoteService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
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
              <Link to="/app/drive/personal">
                <Button variant="secondary">{t('workspace.backToDrive')}</Button>
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
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

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
