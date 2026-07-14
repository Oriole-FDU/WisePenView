import { DRAWIO_EMBED_URL } from '@/apis/clientUrls';
import { ResultState, Spin } from '@/components/Feedback';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useNoteService, useResourceService, useUserService } from '@/domains';
import type {
  DrawIoLatestSnapshotData,
  NoteInfoDisplayData,
  NoteVersionListPage,
} from '@/domains/Note';
import type { ResourceAction } from '@/domains/Resource';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Button, toast } from '@heroui/react';
import { useEventListener, useRequest, useUnmount, useUpdateEffect } from 'ahooks';
import { History, Save } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ResourceFavoriteButton from '../_common/ResourceFavoriteButton';
import styles from './style.module.less';

const EMPTY_DRAWIO_XML = `<mxfile host="WisePen"><diagram name="Page-1"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
const WISEPEN_COLOR_SCHEME_STORAGE_KEY = 'heroui-color-scheme';
const WISEPEN_COLOR_SCHEMES = new Set([
  'default',
  'warm',
  'academic',
  'violet',
  'forest',
  'minimal',
]);

type SaveState = 'saved' | 'dirty' | 'saving' | 'failed';

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

interface DrawioMessage {
  event?: string;
  xml?: string;
  message?: string;
}

function decodeBase64Utf8(value?: string | null): string {
  if (!value) return EMPTY_DRAWIO_XML;
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readDrawioMessage(raw: unknown): DrawioMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as DrawioMessage;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function extractPlainText(xml: string): string | undefined {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const values = Array.from(doc.querySelectorAll('mxCell[value]'))
      .map((cell) => cell.getAttribute('value') ?? '')
      .filter(Boolean)
      .map((value) => new DOMParser().parseFromString(value, 'text/html').body.textContent ?? '')
      .map((value) => value.trim())
      .filter(Boolean);
    return values.length > 0 ? values.join(' ') : undefined;
  } catch {
    return undefined;
  }
}

function readDrawioEmbedUrl(): URL {
  return new URL(DRAWIO_EMBED_URL);
}

function readDrawioEmbedOrigin(): string {
  return readDrawioEmbedUrl().origin;
}

function readWisePenTheme(): 'light' | 'dark' {
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

function buildDrawioUrl(canEdit: boolean): string {
  const url = readDrawioEmbedUrl();
  const wisePenTheme = readWisePenTheme();
  const wisePenColorScheme = readWisePenColorScheme();
  url.searchParams.set('embed', '1');
  url.searchParams.set('proto', 'json');
  url.searchParams.set('spin', '1');
  url.searchParams.set('pages', '0');
  url.searchParams.set('hide-pages', '1');
  url.searchParams.delete('ui');
  url.searchParams.set('libraries', '1');
  url.searchParams.set('noExitBtn', '1');
  url.searchParams.set('saveAndExit', '0');
  url.searchParams.set('wisepenTheme', wisePenTheme);
  url.searchParams.set('wisepenColorScheme', wisePenColorScheme);
  url.searchParams.set('dark', wisePenTheme === 'dark' ? '1' : '0');
  if (!canEdit) {
    url.searchParams.set('noSaveBtn', '1');
  }
  return url.toString();
}

function DrawioLayoutConfig({
  children,
  resourceId,
  resourceName = 'Draw.io 图',
  ownerId,
  currentActions,
  copyVersion,
  onPermissionSuccess,
  titleMeta,
  actions,
}: {
  children: ReactNode;
  resourceId?: string;
  resourceName?: string;
  ownerId?: string | null;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  onPermissionSuccess?: () => void;
  titleMeta?: ReactNode;
  actions?: ReactNode;
}) {
  const frameConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      className: styles.container,
      header: {
        resource: {
          resourceId,
          resourceName,
          resourceIconType: 'drawio',
          currentActions,
          copyVersion,
          permissionResourceType: WORKSPACE_RESOURCE_TYPE.DRAWIO,
          ownerId,
          onPermissionSuccess,
          titleMeta,
          actions,
        },
      },
    }),
    [
      actions,
      copyVersion,
      currentActions,
      onPermissionSuccess,
      ownerId,
      resourceId,
      resourceName,
      titleMeta,
    ]
  );
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function SaveStatusText({ state }: { state: SaveState }) {
  const text =
    state === 'dirty'
      ? '未保存'
      : state === 'saving'
        ? '保存中'
        : state === 'failed'
          ? '保存失败'
          : '已保存';
  return <span className={styles.saveStatus}>{text}</span>;
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
  return (
    <AppDisplayDialog
      isOpen={open}
      onOpenChange={(visible) => !visible && onClose()}
      title="版本记录"
      size="md"
      closeText="关闭"
    >
      {loading ? (
        <div className={styles.modalState}>
          <Spin />
          <span>正在加载版本记录...</span>
        </div>
      ) : error ? (
        <ResultState
          status="warning"
          title="版本记录加载失败"
          subTitle={parseErrorMessage(error)}
        />
      ) : !versions || versions.list.length === 0 ? (
        <ResultState status="info" title="暂无版本记录" />
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
  const { noteInfoDisplay, snapshot, initialXml } = data;
  const noteService = useNoteService();
  const userService = useUserService();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialVersion = Math.max(noteInfoDisplay.version ?? 0, snapshot.version ?? 0);
  const currentVersionRef = useRef(initialVersion);
  const lastSavedXmlRef = useRef(initialXml);
  const exportTimerRef = useRef<number | null>(null);
  const pendingExportForSaveRef = useRef(false);
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [editorReady, setEditorReady] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const canEdit = noteInfoDisplay.canCollaborativeEdit;
  const canViewVersions = Boolean(noteInfoDisplay.ownerId);
  const title = useResourceDisplayName(resourceId, noteInfoDisplay.noteTitle, '未命名图表');
  const drawioUrl = useMemo(() => buildDrawioUrl(canEdit), [canEdit]);
  const drawioOrigin = readDrawioEmbedOrigin();

  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(noteInfoDisplay.ownerId),
    refreshDeps: [noteInfoDisplay.ownerId],
  });

  const postToEditor = useCallback(
    (message: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), drawioOrigin);
    },
    [drawioOrigin]
  );

  const clearExportTimer = useCallback(() => {
    if (exportTimerRef.current !== null) {
      window.clearTimeout(exportTimerRef.current);
      exportTimerRef.current = null;
    }
  }, []);

  const persistXml = useCallback(
    async (xml: string) => {
      if (!canEdit) {
        toast.danger('你没有编辑权限');
        return;
      }

      const nextVersion = currentVersionRef.current + 1;
      setSaveState('saving');
      try {
        await noteService.saveDrawIoSnapshot({
          resourceId,
          version: nextVersion,
          xml,
          plainText: extractPlainText(xml),
        });
        currentVersionRef.current = nextVersion;
        lastSavedXmlRef.current = xml;
        setCurrentVersion(nextVersion);
        setSaveState('saved');
        postToEditor({ action: 'status', message: '已保存', modified: false });
        toast.success('已保存');
      } catch (err) {
        setSaveState('failed');
        postToEditor({ action: 'status', message: '保存失败', modified: true });
        toast.danger(parseErrorMessage(err));
      }
    },
    [canEdit, noteService, postToEditor, resourceId]
  );

  const requestEditorExport = useCallback(() => {
    if (!canEdit) {
      toast.danger('你没有编辑权限');
      return;
    }
    if (!editorLoaded) {
      toast.info('编辑器未就绪');
      return;
    }
    if (saveState === 'saved') {
      toast.info('当前内容已保存');
      return;
    }

    pendingExportForSaveRef.current = true;
    setSaveState('saving');
    postToEditor({ action: 'export', format: 'xml' });
    clearExportTimer();
    exportTimerRef.current = window.setTimeout(() => {
      pendingExportForSaveRef.current = false;
      setSaveState('failed');
      toast.danger('保存失败，请稍后重试');
    }, 10000);
  }, [canEdit, clearExportTimer, editorLoaded, postToEditor, saveState]);

  useUpdateEffect(() => {
    currentVersionRef.current = Math.max(noteInfoDisplay.version ?? 0, snapshot.version ?? 0);
    setCurrentVersion(currentVersionRef.current);
    lastSavedXmlRef.current = initialXml;
    setSaveState('saved');
    setEditorReady(false);
    setEditorLoaded(false);
  }, [initialXml, noteInfoDisplay.version, resourceId, snapshot.version]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== drawioOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = readDrawioMessage(event.data);
      if (!message?.event) return;

      if (message.event === 'init') {
        setEditorReady(true);
        postToEditor({
          action: 'load',
          autosave: canEdit ? 1 : 0,
          modified: false,
          noExitBtn: 1,
          noSaveBtn: canEdit ? 0 : 1,
          saveAndExit: 0,
          xml: initialXml,
        });
        return;
      }

      if (message.event === 'load') {
        setEditorLoaded(true);
        setSaveState('saved');
        return;
      }

      if (message.event === 'autosave' && canEdit && typeof message.xml === 'string') {
        if (message.xml !== lastSavedXmlRef.current && saveState !== 'saving') {
          setSaveState('dirty');
        }
        return;
      }

      if (message.event === 'save' && typeof message.xml === 'string') {
        void persistXml(message.xml);
        return;
      }

      if (message.event === 'export' && pendingExportForSaveRef.current) {
        pendingExportForSaveRef.current = false;
        clearExportTimer();
        if (typeof message.xml === 'string') {
          void persistXml(message.xml);
        } else {
          setSaveState('failed');
          toast.danger('保存失败，请稍后重试');
        }
        return;
      }

      if (message.event === 'error') {
        toast.danger(message.message || 'Draw.io 编辑器加载失败');
      }
    },
    [canEdit, clearExportTimer, drawioOrigin, initialXml, persistXml, postToEditor, saveState]
  );

  useEventListener('message', handleMessage);

  useUnmount(clearExportTimer);

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

  const headerActions = (
    <div className={styles.headerExtra}>
      <ResourceFavoriteButton resourceId={resourceId} onSuccess={onRefreshDrawioInfo} />
      {currentUser?.id === noteInfoDisplay.ownerId && canViewVersions ? (
        <Button size="sm" variant="secondary" onPress={handleOpenVersions} aria-label="版本记录">
          <History size={16} />
          <span>版本</span>
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          size="sm"
          variant="primary"
          isDisabled={!editorLoaded || saveState === 'saved' || saveState === 'saving'}
          onPress={requestEditorExport}
          aria-label="保存"
        >
          <Save size={16} />
          <span>{saveState === 'saving' ? '保存中' : '保存'}</span>
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
      copyVersion={currentVersion}
      onPermissionSuccess={onRefreshDrawioInfo}
      titleMeta={
        <>
          <span className={styles.versionBadge}>v{currentVersion}</span>
          <SaveStatusText state={saveState} />
        </>
      }
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
            <span>正在加载 Draw.io 编辑器...</span>
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
  const noteService = useNoteService();
  const resourceService = useResourceService();
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

  useRequest(() => resourceService.interactRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <DrawioLayoutConfig>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title="无法打开 Draw.io 图"
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
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
            title="Draw.io 图加载失败"
            subTitle={parseErrorMessage(error)}
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
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
            <span className={styles.middleOverlayText}>正在加载 Draw.io 图...</span>
          </div>
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (!data) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title="Draw.io 图信息为空" />
        </div>
      </DrawioLayoutConfig>
    );
  }

  const resourceType = data.noteInfoDisplay.resourceInfo?.resourceType?.trim().toLowerCase();
  if (resourceType !== WORKSPACE_RESOURCE_TYPE.DRAWIO) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title="当前资源不是 Draw.io 图" />
        </div>
      </DrawioLayoutConfig>
    );
  }

  return (
    <DrawioViewConnected
      resourceId={resourceId}
      data={data}
      onRefreshDrawioInfo={refreshDrawioInfo}
    />
  );
}

export default DrawioView;
