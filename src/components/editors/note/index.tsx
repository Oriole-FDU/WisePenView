import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import EditorWorkspace from '@/components/editors/EditorWorkspace';
import { NoteEditorSession } from '@/components/editors/note/CustomBlockNote/NoteEditorSession';
import { publicAppConfig } from '@/config/runtimeConfig';
import { useNoteService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { EditorSurfaceProvider, useEditorSurface } from '../_context';
import { useEditorRuntime } from '../_runtime/useEditorRuntime';
import type { EditorSurfaceProps } from '../editor.type';
import NoteWorkspace from './components/NoteWorkspace';
import styles from './style.module.less';

function NoteOpenFailure({ subTitle }: { subTitle?: string }) {
  const { t } = useTranslation('note');
  return (
    <EditorWorkspace className={styles.pageWrap}>
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
    </EditorWorkspace>
  );
}

function NoteInfoLoading() {
  const { t } = useTranslation('note');
  return (
    <EditorWorkspace className={styles.pageWrap}>
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>{t('workspace.loadingInfo')}</span>
        </div>
      </div>
    </EditorWorkspace>
  );
}

function NoteEditorContent() {
  const {
    target: { resourceId },
  } = useEditorSurface();
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
      if (publicAppConfig.mode === 'mock') {
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

  useEditorRuntime({ error, ...(!noteInfoDisplay ? { loading } : {}) });

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
    <NoteEditorSession
      key={`${resourceId}:${Boolean(noteInfoDisplay.aiDiffPreview)}`}
      resourceId={resourceId}
      canCollaborativeEdit={noteInfoDisplay.canCollaborativeEdit}
      aiDiffPreview={noteInfoDisplay.aiDiffPreview}
    >
      <NoteWorkspace
        resourceId={resourceId}
        noteInfoDisplay={noteInfoDisplay}
        onRefreshNoteInfo={refresh}
      />
    </NoteEditorSession>
  );
}

export default function NoteEditor(props: EditorSurfaceProps) {
  return (
    <EditorSurfaceProvider {...props} kind="note">
      <NoteEditorContent />
    </EditorSurfaceProvider>
  );
}
