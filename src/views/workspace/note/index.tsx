import { ResultState, Spin } from '@/components/Feedback';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useRequest, useUnmount } from 'ahooks';
import { ChevronsLeft, Menu } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { shouldUseDeveloperWsIdentity } from '@/apis/gray';
import EntryIcon from '@/components/Icons/EntryIcon';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type { NoteBodyEditorHandle } from '@/components/Note/CustomBlockNote/index.type';
import NoteOutline from '@/components/Note/NoteOutline';
import {
  NOTE_OUTLINE_TITLE_ID,
  type NoteOutlineItem,
} from '@/components/Note/NoteOutline/index.type';
import { useNoteService, useResourceService, useUserService } from '@/domains';
import type { AiDiffDisplayMode, NoteInfoDisplayData } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE, AI_DIFF_DISPLAY_MODE_LABELS, useNoteSession } from '@/domains/Note';
import { encodeNoteClientStateVector } from '@/domains/Note/session/stateVector';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { useWorkspaceLayoutConfig } from '@/layouts/Workspace/WorkspaceOutletContext';
import { useAiDiffDisplayStore } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Alert, Button, Dropdown, toast } from '@heroui/react';
import ResourcePermissionControl from '../_components/ResourcePermissionControl';
import NoteInfoBar from './_components/NoteInfoBar';
import NoteTitle from './_components/NoteTitle';
import type { NoteTitleHandle } from './_components/NoteTitle/index.type';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  actorUserId?: string;
  onRefreshNoteInfo: () => void;
}

interface NoteToolbarTitleProps {
  resourceId: string;
  fallbackTitle?: string;
}

const AI_DIFF_DISPLAY_OPTIONS: Array<{ value: AiDiffDisplayMode; label: string }> = [
  {
    value: AI_DIFF_DISPLAY_MODE.OLD_ONLY,
    label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.OLD_ONLY],
  },
  {
    value: AI_DIFF_DISPLAY_MODE.NEW_ONLY,
    label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.NEW_ONLY],
  },
  {
    value: AI_DIFF_DISPLAY_MODE.COMPARE,
    label: AI_DIFF_DISPLAY_MODE_LABELS[AI_DIFF_DISPLAY_MODE.COMPARE],
  },
];

function NoteLayoutConfig({ children }: { children: ReactNode }) {
  const frameConfig = useMemo(() => ({ className: styles.pageWrap }), []);
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function NoteToolbarTitle({ resourceId, fallbackTitle }: NoteToolbarTitleProps) {
  const title = useResourceDisplayName(resourceId, fallbackTitle, '未命名笔记');

  return (
    <span className={styles.toolbarTitleText}>
      <span className={styles.toolbarTitleIcon} aria-hidden="true">
        <EntryIcon entryType="resource" resourceType={RESOURCE_TYPE.NOTE} />
      </span>
      <span className={styles.toolbarTitleLabel}>{title}</span>
    </span>
  );
}

function NoteViewConnected({
  resourceId,
  noteInfoDisplay,
  actorUserId,
  onRefreshNoteInfo,
}: NoteViewConnectedProps) {
  const aiDiffDisplayMode = useAiDiffDisplayStore((state) => state.displayMode);
  const setAiDiffDisplayMode = useAiDiffDisplayStore((state) => state.setDisplayMode);
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [isDownloadingMarkdown, setIsDownloadingMarkdown] = useState(false);
  const [aiDiffPresence, setAiDiffPresence] = useState<{
    resourceId: string;
    hasAiDiffContent: boolean;
  }>({
    resourceId,
    hasAiDiffContent: false,
  });
  const { status, doc, provider, reconnect } = useNoteSession(resourceId, actorUserId);
  const getNoteClientStateVector = useCallback(
    () => encodeNoteClientStateVector(doc),
    [doc]
  );

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  const showFullPageSpin = status === 'connecting';
  const fallbackNoteTitle = noteInfoDisplay.noteTitle;

  const resourceService = useResourceService();

  // 进入页面时上报阅读
  useRequest(() => resourceService.interactRead(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const focusBody = () => {
    bodyEditorRef.current?.focus();
  };

  useUnmount(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  });

  const handleReconnect = () => {
    reconnect();

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    setIsReconnectLoading(true);
    reconnectTimerRef.current = window.setTimeout(() => {
      setIsReconnectLoading(false);
      reconnectTimerRef.current = null;
    }, 2000);
  };

  const showAiDiffDisplayModeSwitch =
    aiDiffPresence.resourceId === resourceId && aiDiffPresence.hasAiDiffContent;

  const handleAiDiffPresenceChange = useCallback(
    (hasAiDiffContent: boolean) => {
      setAiDiffPresence({ resourceId, hasAiDiffContent });
    },
    [resourceId]
  );

  const handlePrintPdf = useCallback(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    const titleApi = titleEditorRef.current;
    const title = titleApi?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
    const titleRoot = titleApi?.getProseMirrorRoot() ?? null;
    try {
      setPdfExportLoading(true);
      await bodyApi.exportPdf({ title, titleRoot });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setPdfExportLoading(false);
    }
  }, [fallbackNoteTitle]);

  const handleDownloadMarkdown = useCallback(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    try {
      setIsDownloadingMarkdown(true);
      const title = titleEditorRef.current?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
      await bodyApi.downloadMarkdown(title);
      toast.success('Markdown 下载已开始');
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setIsDownloadingMarkdown(false);
    }
  }, [fallbackNoteTitle]);

  const headerMorePending = pdfExportLoading || isDownloadingMarkdown;

  const handleMoreAction = useCallback(
    (key: React.Key) => {
      if (key === 'print-pdf') {
        void handlePrintPdf();
        return;
      }
      if (key === 'download-md') {
        void handleDownloadMarkdown();
      }
    },
    [handleDownloadMarkdown, handlePrintPdf]
  );

  const workspaceFrameConfig = useMemo(
    () => ({
      className: styles.pageWrap,
      chatContext: {
        resourceId,
        resourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
        editorType: 'note',
        noteSyncStatus: status,
        getNoteClientStateVector,
      },
      header: {
        inlineTitle: (
          <NoteToolbarTitle resourceId={resourceId} fallbackTitle={noteInfoDisplay?.noteTitle} />
        ),
        extra: (
          <div className={styles.headerToolbarExtra}>
            {showAiDiffDisplayModeSwitch ? (
              <SegmentedTabs<AiDiffDisplayMode>
                ariaLabel="AI 差异展示模式"
                selectedKey={aiDiffDisplayMode}
                className={styles.aiDiffDisplayModeSwitch}
                items={AI_DIFF_DISPLAY_OPTIONS.map((option) => ({
                  key: option.value,
                  label: option.label,
                  disabled: showFullPageSpin,
                }))}
                onSelectionChange={setAiDiffDisplayMode}
              />
            ) : null}
            <ResourcePermissionControl
              resourceId={resourceId}
              resourceType={WORKSPACE_RESOURCE_TYPE.NOTE}
              ownerId={noteInfoDisplay.ownerId}
              isDisabled={showFullPageSpin}
              onSuccess={onRefreshNoteInfo}
            />
            <div className={styles.headerMoreWrap}>
              <Dropdown>
                <Dropdown.Trigger>
                  <Button
                    variant="secondary"
                    size="sm"
                    isPending={headerMorePending}
                    isDisabled={showFullPageSpin}
                    aria-label="更多"
                  >
                    更多
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu aria-label="笔记更多操作" onAction={handleMoreAction}>
                    <Dropdown.Item id="print-pdf" textValue="打印为pdf">
                      打印为pdf
                    </Dropdown.Item>
                    <Dropdown.Item id="download-md" textValue="下载为md">
                      下载为md
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>
        ),
      },
    }),
    [
      aiDiffDisplayMode,
      handleMoreAction,
      headerMorePending,
      getNoteClientStateVector,
      noteInfoDisplay?.noteTitle,
      noteInfoDisplay.ownerId,
      onRefreshNoteInfo,
      resourceId,
      setAiDiffDisplayMode,
      showAiDiffDisplayModeSwitch,
      showFullPageSpin,
      status,
    ]
  );
  useWorkspaceLayoutConfig(workspaceFrameConfig);

  return (
    <>
      <div className={styles.mainScroll} ref={mainScrollRef}>
        <div className={styles.contentRow}>
          {isOutlineOpen ? (
            <aside className={styles.outlineAside} aria-label="文档目录侧栏">
              <div className={styles.outlineTopRow}>
                <span className={styles.outlineTopTitle}>目录</span>
                <button
                  type="button"
                  className={styles.outlineToggleBtn}
                  aria-label="收起目录"
                  onClick={() => setIsOutlineOpen(false)}
                >
                  <ChevronsLeft size={20} />
                </button>
              </div>
              <div className={styles.outlineScrollArea}>
                <NoteOutline
                  items={outlineItems}
                  activeId={activeHeadingId}
                  titleResourceId={resourceId}
                  titleFallback={noteInfoDisplay?.noteTitle}
                  onNavigate={(id) => {
                    if (id === NOTE_OUTLINE_TITLE_ID) {
                      const anchor = titleAnchorRef.current;
                      if (anchor) {
                        anchor.scrollIntoView({ block: 'start', behavior: 'smooth' });
                        window.requestAnimationFrame(() => {
                          const editable = anchor.querySelector(
                            '[contenteditable="true"]'
                          ) as HTMLElement | null;
                          editable?.focus();
                        });
                      } else {
                        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                      return;
                    }
                    bodyEditorRef.current?.navigateToBlock(id);
                  }}
                />
              </div>
            </aside>
          ) : (
            <div className={styles.outlineCollapsedCol} aria-label="展开目录">
              <button
                type="button"
                className={styles.outlineToggleBtn}
                aria-label="展开目录"
                onClick={() => setIsOutlineOpen(true)}
              >
                <Menu size={20} />
              </button>
            </div>
          )}

          <div className={styles.mainCol}>
            <div className={styles.root}>
              {isDisconnected ? (
                <Alert className={styles.wsAlert} status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      网络连接已断开，当前可继续本地编辑；网络恢复后会自动同步到云端。
                    </Alert.Description>
                  </Alert.Content>
                  <div className={styles.wsAlertAction}>
                    <Button
                      variant="secondary"
                      size="sm"
                      isDisabled={isReconnectLoading}
                      onPress={handleReconnect}
                    >
                      重试
                    </Button>
                  </div>
                </Alert>
              ) : null}
              <div ref={titleAnchorRef}>
                <NoteTitle
                  key={`${resourceId}-${noteInfoDisplay?.noteTitle ?? ''}-${noteInfoDisplay.canCollaborativeEdit}`}
                  ref={titleEditorRef}
                  id={resourceId}
                  initialContent={noteInfoDisplay?.noteTitle}
                  readOnly={isTitleReadOnly}
                  focusOnMount={isConnected && !isTitleReadOnly}
                  onEnterKey={focusBody}
                />
              </div>
              <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
              <div className={styles.body}>
                <CustomBlockNote
                  key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}`}
                  ref={bodyEditorRef}
                  resourceId={resourceId}
                  doc={doc}
                  provider={provider}
                  aiDiffDisplayMode={aiDiffDisplayMode}
                  readOnly={isEditorReadOnly}
                  blockLocalDocWrites={blockLocalDocWrites}
                  onOutlineChange={setOutlineItems}
                  onActiveHeadingChange={setActiveHeadingId}
                  onAiDiffPresenceChange={handleAiDiffPresenceChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在连接笔记服务...</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface NoteViewProps {
  resourceId?: string;
}

function NoteView({ resourceId = '' }: NoteViewProps = {}) {
  const noteService = useNoteService();
  const userService = useUserService();
  const needsDeveloperWsIdentity = shouldUseDeveloperWsIdentity();
  const {
    data: noteInfoDisplay,
    loading: isNoteInfoLoading,
    error: noteInfoError,
    refresh: refreshNoteInfo,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });
  const {
    data: currentUser,
    loading: isCurrentUserLoading,
    error: currentUserError,
  } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(resourceId && needsDeveloperWsIdentity),
    refreshDeps: [resourceId, needsDeveloperWsIdentity],
  });
  const actorUserId = needsDeveloperWsIdentity ? currentUser?.id : undefined;

  if (!resourceId) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开笔记"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (noteInfoError) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开笔记"
              subTitle={parseErrorMessage(noteInfoError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (needsDeveloperWsIdentity && currentUserError) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="鏃犳硶杩炴帴绗旇鏈嶅姟"
              subTitle={parseErrorMessage(currentUserError)}
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">杩斿洖浜戠洏</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (
    (isNoteInfoLoading && !noteInfoDisplay) ||
    (needsDeveloperWsIdentity && isCurrentUserLoading && !currentUser)
  ) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在加载笔记信息...</span>
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (needsDeveloperWsIdentity && !actorUserId) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="鏃犳硶杩炴帴绗旇鏈嶅姟"
              subTitle="鏈幏鍙栧埌褰撳墠鐢ㄦ埛韬唤锛岃閲嶆柊鐧诲綍鍚庡啀璇?"
              extra={
                <Link to="/login">
                  <Button variant="secondary">閲嶆柊鐧诲綍</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  if (!noteInfoDisplay) {
    return (
      <NoteLayoutConfig>
        <div className={styles.middleOverlay}>
          <div className={styles.middleOverlayInner}>
            <ResultState
              status="warning"
              title="无法打开笔记"
              subTitle="笔记信息为空，请稍后重试"
              extra={
                <Link to="/app/drive">
                  <Button variant="secondary">返回云盘</Button>
                </Link>
              }
            />
          </div>
        </div>
      </NoteLayoutConfig>
    );
  }

  return (
    <NoteViewConnected
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      actorUserId={actorUserId}
      onRefreshNoteInfo={refreshNoteInfo}
    />
  );
}

export default NoteView;
