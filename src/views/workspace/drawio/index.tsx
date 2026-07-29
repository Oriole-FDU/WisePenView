import { DRAWIO_EMBED_URL } from '@/apis/clientUrls';
import { ResultState, Spin } from '@/components/Feedback';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useInteractService, useNoteService, useUserService } from '@/domains';
import type {
  DrawIoLatestSnapshotData,
  NoteInfoDisplayData,
  NoteVersionListPage,
} from '@/domains/Note';
import type { ResourceAction, ResourceItem } from '@/domains/Resource';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { History, Save } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDrawioEditorSession } from './_hooks/useDrawioEditorSession';
import {
  buildDrawioUrl,
  decodeBase64Utf8,
  readDrawioEmbedOrigin,
  type DrawioSaveState,
  type WisePenTheme,
} from './drawioProtocol';
import styles from './style.module.less';

const WISEPEN_COLOR_SCHEME_STORAGE_KEY = 'heroui-color-scheme';
const WISEPEN_COLOR_SCHEMES = new Set([
  'default',
  'warm',
  'academic',
  'violet',
  'forest',
  'minimal',
]);

interface DrawioViewProps {
  resourceId?: string;
}

interface DrawioViewData {
  noteInfoDisplay: NoteInfoDisplayData;
  snapshot: DrawIoLatestSnapshotData;
  initialXml: string;
}

interface DrawioViewConnectedProps {
  resourceId: string;
  data: DrawioViewData;
  onRefreshDrawioInfo: () => void;
}

function readWisePenTheme(): WisePenTheme {
  const root = document.documentElement;
  const dataTheme = root.getAttribute('data-theme');

  if (dataTheme === 'dark' || root.classList.contains('dark')) {
    return 'dark';
  }

  return 'light';
}

function readWisePenColorScheme(): string {
  const rootScheme = document.documentElement.getAttribute('data-color-scheme');

  if (rootScheme && WISEPEN_COLOR_SCHEMES.has(rootScheme)) {
    return rootScheme;
  }

  try {
    const storedScheme = window.localStorage.getItem(WISEPEN_COLOR_SCHEME_STORAGE_KEY);

    if (storedScheme && WISEPEN_COLOR_SCHEMES.has(storedScheme)) {
      return storedScheme;
    }
  } catch {
    // localStorage 不可用时使用默认主题。
  }

  return 'default';
}

function DrawioLayoutConfig({
  children,
  resourceId,
  resourceName,
  ownerId,
  currentActions,
  resourceInfo,
  copyVersion,
  onPermissionSuccess,
  onResourceChanged,
  titleMeta,
  actions,
}: {
  children: ReactNode;
  resourceId?: string;
  resourceName?: string;
  ownerId?: string | null;
  currentActions?: ResourceAction[] | null;
  resourceInfo?: ResourceItem;
  copyVersion?: number;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
  titleMeta?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useTranslation('workspace');
  const displayResourceName = resourceName ?? t('drawio.defaultName');
  const frameConfig = {
    className: styles.container,
    sidePanel: resourceInfo ? { resource: resourceInfo, onResourceChanged } : undefined,
    header: {
      resource: {
        resourceId,
        resourceName: displayResourceName,
        resourceIconType: 'drawio',
        currentActions,
        copyVersion,
        permissionResourceType: RESOURCE_KIND.DRAWIO,
        ownerId,
        onPermissionSuccess,
        titleMeta,
        actions,
      },
    },
  } satisfies ResourceHostLayoutConfig;
  useResourceHostLayoutConfig(
    () => frameConfig,
    [
      actions,
      copyVersion,
      currentActions,
      onPermissionSuccess,
      onResourceChanged,
      ownerId,
      resourceId,
      resourceInfo,
      displayResourceName,
      titleMeta,
    ]
  );

  return <>{children}</>;
}

function SaveStatusText({ state }: { state: DrawioSaveState }) {
  const { t } = useTranslation('workspace');
  return <span className={styles.saveStatus}>{t(`drawio.status.${state}`)}</span>;
}

function VersionModal({
  open,
  loading,
  error,
  versions,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error?: unknown;
  versions?: NoteVersionListPage;
  onClose: () => void;
}) {
  const { t } = useTranslation(['workspace', 'common']);

  return (
    <AppDisplayDialog
      isOpen={open}
      onOpenChange={(visible) => !visible && onClose()}
      title={t('drawio.versions')}
      size="md"
      closeText={t('actions.close', { ns: 'common' })}
    >
      {loading ? (
        <div className={styles.modalState}>
          <Spin />
          <span>{t('drawio.versionsLoading')}</span>
        </div>
      ) : error ? (
        <ResultState
          status="warning"
          title={t('drawio.versionsFailed')}
          subTitle={parseErrorMessage(error)}
        />
      ) : !versions || versions.list.length === 0 ? (
        <ResultState status="info" title={t('drawio.versionsEmpty')} />
      ) : (
        <div className={styles.versionList}>
          {versions.list.map((item) => (
            <div key={`${item.version}-${item.type}`} className={styles.versionRow}>
              <span>v{item.version ?? '-'}</span>
              <span>{item.type ?? '-'}</span>
              <span>{item.createdBy?.join(', ') || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </AppDisplayDialog>
  );
}

function DrawioViewConnected({ resourceId, data, onRefreshDrawioInfo }: DrawioViewConnectedProps) {
  const { i18n, t } = useTranslation(['workspace', 'common']);
  const { noteInfoDisplay, snapshot, initialXml } = data;
  const noteService = useNoteService();
  const userService = useUserService();
  const initialVersion = Math.max(noteInfoDisplay.version ?? 0, snapshot.version ?? 0);
  const [versionOpen, setVersionOpen] = useState(false);
  const canEdit = noteInfoDisplay.canCollaborativeEdit;
  const canViewVersions = Boolean(noteInfoDisplay.ownerId);
  const title = useResourceDisplayName(resourceId, noteInfoDisplay.noteTitle, t('drawio.unnamed'));
  const drawioUrl = buildDrawioUrl({
    embedUrl: DRAWIO_EMBED_URL,
    canEdit,
    language: i18n.resolvedLanguage ?? 'zh-CN',
    theme: readWisePenTheme(),
    colorScheme: readWisePenColorScheme(),
  });
  const drawioOrigin = readDrawioEmbedOrigin(DRAWIO_EMBED_URL);
  const { iframeRef, currentVersion, saveState, editorReady, editorLoaded, requestSave } =
    useDrawioEditorSession({
      canEdit,
      drawioOrigin,
      initialVersion,
      initialXml,
      noteService,
      resourceId,
    });

  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(noteInfoDisplay.ownerId),
    refreshDeps: [noteInfoDisplay.ownerId],
  });

  const {
    data: versions,
    error: versionsError,
    loading: versionsLoading,
    run: runLoadVersions,
  } = useRequest(() => noteService.listNoteVersions({ resourceId, page: 1, size: 20 }), {
    manual: true,
  });

  const handleOpenVersions = () => {
    setVersionOpen(true);
    runLoadVersions();
  };

  const titleMeta = (
    <>
      <span className={styles.versionBadge}>v{currentVersion}</span>
      <SaveStatusText state={saveState} />
    </>
  );

  const headerActions = (
    <div className={styles.headerExtra}>
      {currentUser?.id === noteInfoDisplay.ownerId && canViewVersions ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={handleOpenVersions}
          aria-label={t('drawio.versions')}
        >
          <History size={16} />
          <span>{t('drawio.version')}</span>
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          size="sm"
          variant="primary"
          isDisabled={!editorLoaded || saveState === 'saved' || saveState === 'saving'}
          onPress={requestSave}
          aria-label={t('actions.save', { ns: 'common' })}
        >
          <Save size={16} />
          <span>
            {saveState === 'saving'
              ? t('drawio.status.saving')
              : t('actions.save', { ns: 'common' })}
          </span>
        </Button>
      ) : null}
    </div>
  );

  return (
    <DrawioLayoutConfig
      resourceId={resourceId}
      resourceName={title}
      ownerId={noteInfoDisplay.ownerId}
      currentActions={noteInfoDisplay.resourceInfo?.currentActions}
      resourceInfo={noteInfoDisplay.resourceInfo}
      copyVersion={currentVersion}
      onPermissionSuccess={onRefreshDrawioInfo}
      onResourceChanged={onRefreshDrawioInfo}
      titleMeta={titleMeta}
      actions={headerActions}
    >
      <div className={styles.content}>
        <iframe
          key={`${resourceId}-${canEdit ? 'edit' : 'view'}`}
          ref={iframeRef}
          className={styles.iframe}
          src={drawioUrl}
          title={title}
          allow="clipboard-read; clipboard-write"
        />
        {(!editorReady || !editorLoaded) && (
          <div className={styles.loadingOverlay} aria-busy="true" aria-live="polite">
            <Spin size="large" />
            <span>{t('drawio.editorLoading')}</span>
          </div>
        )}
      </div>
      <VersionModal
        open={versionOpen}
        loading={versionsLoading}
        error={versionsError}
        versions={versions}
        onClose={() => setVersionOpen(false)}
      />
    </DrawioLayoutConfig>
  );
}

function DrawioView({ resourceId }: DrawioViewProps) {
  const { t } = useTranslation('workspace');
  const noteService = useNoteService();
  const interactService = useInteractService();
  const {
    data,
    error,
    loading: loadingDrawio,
    refresh: refreshDrawioInfo,
  } = useRequest(
    async () => {
      const [noteInfoDisplay, snapshot] = await Promise.all([
        noteService.getNoteInfoDisplay({ resourceId: resourceId as string }),
        noteService.getDrawIoLatestSnapshot({ resourceId: resourceId as string }),
      ]);

      return {
        noteInfoDisplay,
        snapshot,
        initialXml: decodeBase64Utf8(snapshot.fullSnapshot),
      };
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  useRequest(() => interactService.recordResourceRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <DrawioLayoutConfig>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title={t('drawio.cannotOpen')}
            extra={
              <Link to="/app/drive/personal">
                <Button variant="secondary">{t('viewer.backToDrive')}</Button>
              </Link>
            }
          />
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (error) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title={t('drawio.loadFailed')}
            subTitle={parseErrorMessage(error)}
            extra={
              <Link to="/app/drive/personal">
                <Button variant="secondary">{t('viewer.backToDrive')}</Button>
              </Link>
            }
          />
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (loadingDrawio && !data) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{t('drawio.loading')}</span>
          </div>
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (!data) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title={t('drawio.emptyInfo')} />
        </div>
      </DrawioLayoutConfig>
    );
  }

  const resourceType = data.noteInfoDisplay.resourceInfo?.resourceType?.trim().toLowerCase();
  if (resourceType !== RESOURCE_KIND.DRAWIO) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title={t('drawio.wrongType')} />
        </div>
      </DrawioLayoutConfig>
    );
  }

  const drawioSessionKey = `${resourceId}:${data.noteInfoDisplay.version ?? 'none'}:${
    data.snapshot.version ?? 'none'
  }`;

  return (
    <DrawioViewConnected
      key={drawioSessionKey}
      resourceId={resourceId}
      data={data}
      onRefreshDrawioInfo={refreshDrawioInfo}
    />
  );
}

export default DrawioView;
