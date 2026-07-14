import { ResultState, Spin } from '@/components/Feedback';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useMemoizedFn, useRequest, useUnmount } from 'ahooks';
import { ChevronsRight, Menu, MessageSquare, MessagesSquare } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import { useCommentSettingsSync } from '@/components/Note/CustomBlockNote/comments';
import type {
  NoteBodyEditorHandle,
  NoteCollaborationUser,
} from '@/components/Note/CustomBlockNote/index.type';
import NoteOutline from '@/components/Note/NoteOutline';
import {
  NOTE_OUTLINE_TITLE_ID,
  type NoteOutlineItem,
} from '@/components/Note/NoteOutline/index.type';
import {
  DEFAULT_NOTE_RESOURCE_ASIDE_MODE,
  useNoteResourceAsideStore,
} from '@/components/Note/_store/useNoteResourceAsideStore';
import ResourceDiscussionPanel from '@/components/interact/ResourceDiscussionPanel';
import { useNoteService, useResourceService, useUserService } from '@/domains';
import type {
  AiDiffDisplayMode,
  NoteInfoDisplayData,
  NoteSaveStatus,
  NoteSelectionSnapshot,
} from '@/domains/Note';
import {
  AI_DIFF_DISPLAY_MODE,
  AI_DIFF_DISPLAY_MODE_LABELS,
  encodeNoteClientStateVector,
  useNoteSession,
} from '@/domains/Note';
import { isCommentVisibilityPrivileged } from '@/domains/Resource';
import type { User } from '@/domains/User';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import { useWorkspaceChatProtocolStore } from '@/layouts/Workspace/_store/useWorkspaceChatProtocolStore';
import { parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { Alert, Button, Switch, ToggleButton, Tooltip, toast } from '@heroui/react';
import {
  createNoteSelectionChatContext,
  createNoteWorkspaceChatStateProvider,
} from './NoteWorkspaceChatProtocol';
import NoteInfoBar from './_components/NoteInfoBar';
import NoteTitle from './_components/NoteTitle';
import type { NoteTitleHandle, NoteTitleSaveStatus } from './_components/NoteTitle/index.type';
import { useAiDiffDisplayStore } from './_store/useAiDiffDisplayStore';
import styles from './style.module.less';

interface NoteViewConnectedProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => unknown | Promise<unknown>;
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

const NOTE_COLLABORATION_COLORS = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
  '#059669',
  '#ea580c',
] as const;

function getNoteCollaborationUserName(user?: User): string {
  return user?.nickname?.trim() || user?.realName?.trim() || user?.username?.trim() || '当前用户';
}

function pickNoteCollaborationColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return NOTE_COLLABORATION_COLORS[hash % NOTE_COLLABORATION_COLORS.length];
}

function buildNoteCollaborationUser(user?: User): NoteCollaborationUser {
  const name = getNoteCollaborationUserName(user);
  const colorSeed = user?.id?.trim() || user?.username?.trim() || name;
  return {
    name,
    color: pickNoteCollaborationColor(colorSeed),
  };
}

type NoteHeaderSaveStatus = NoteSaveStatus | 'failed';

function resolveNoteHeaderSaveStatus(
  bodyStatus: NoteSaveStatus,
  titleStatus: NoteTitleSaveStatus
): NoteHeaderSaveStatus {
  if (titleStatus === 'failed') return 'failed';
  if (bodyStatus === 'waiting') return 'waiting';
  if (bodyStatus === 'saving' || titleStatus === 'saving') return 'saving';
  return 'saved';
}

function formatNoteSaveStatus(status: NoteHeaderSaveStatus): string {
  if (status === 'saving') return '保存中...';
  if (status === 'waiting') return '等待网络同步';
  if (status === 'failed') return '保存失败';
  return '已自动保存';
}

function NoteLayoutConfig({ children }: { children: ReactNode }) {
  const frameConfig = useMemo(() => ({ className: styles.pageWrap }), []);
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function NoteViewConnected({
  resourceId,
  noteInfoDisplay,
  onRefreshNoteInfo,
}: NoteViewConnectedProps) {
  const aiDiffDisplayMode = useAiDiffDisplayStore((state) => state.displayMode);
  const setAiDiffDisplayMode = useAiDiffDisplayStore((state) => state.setDisplayMode);
  const setWorkspaceChatContext = useWorkspaceChatProtocolStore((state) => state.setContext);
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const scrollBarHideTimerRef = useRef<number | null>(null);
  const [isReconnectLoading, setIsReconnectLoading] = useState(false);
  const [isMainScrolling, setIsMainScrolling] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isCommentHistoryOpen, setIsCommentHistoryOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const [commentsSidebarHostElement, setCommentsSidebarHostElement] = useState<HTMLElement | null>(
    null
  );
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [isDownloadingMarkdown, setIsDownloadingMarkdown] = useState(false);
  const [titleSaveStatus, setTitleSaveStatus] = useState<NoteTitleSaveStatus>('saved');
  const [aiDiffPresence, setAiDiffPresence] = useState<{
    resourceId: string;
    hasAiDiffContent: boolean;
  }>({
    resourceId,
    hasAiDiffContent: false,
  });
  const resourceService = useResourceService();
  const userService = useUserService();
  const { data: currentUser, error: currentUserError } = useRequest(
    () => userService.getUserInfo(),
    {
      ready: Boolean(resourceId),
    }
  );
  const shouldWaitCurrentUser = !currentUser && !currentUserError;
  const { status, saveStatus, doc, provider, reconnect, idbSynced } = useNoteSession(resourceId, {
    actorUserId: currentUser?.id,
    enabled: !shouldWaitCurrentUser,
  });
  const getNoteClientStateVector = useCallback(() => encodeNoteClientStateVector(doc), [doc]);
  const resourceAsideMode = useNoteResourceAsideStore(
    (state) => state.modeByResourceId[resourceId] ?? DEFAULT_NOTE_RESOURCE_ASIDE_MODE
  );
  const toggleResourceAsideMode = useNoteResourceAsideStore((state) => state.toggleMode);
  const resourceAsideWidth = useNoteResourceAsideStore((state) => state.getWidth(resourceId));
  const setResourceAsideWidth = useNoteResourceAsideStore((state) => state.setWidth);
  const { settings: commentSettings, setCollaboratorVisibility } = useCommentSettingsSync(
    status === 'connected' ? doc : null
  );

  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  const showFullPageSpin = (status === 'connecting' && !idbSynced) || shouldWaitCurrentUser;
  const middleOverlayText =
    status === 'connecting' && !idbSynced ? '正在连接笔记服务...' : '正在加载用户信息...';
  const fallbackNoteTitle = noteInfoDisplay.noteTitle;
  const resourceName = useResourceDisplayName(resourceId, fallbackNoteTitle, '未命名笔记');
  const headerSaveStatus = resolveNoteHeaderSaveStatus(saveStatus, titleSaveStatus);
  const saveStatusText = formatNoteSaveStatus(headerSaveStatus);
  const collaborationUser = useMemo(() => buildNoteCollaborationUser(currentUser), [currentUser]);
  const canRenderBodyEditor = !shouldWaitCurrentUser;
  const canManageCommentVisibility =
    isCommentVisibilityPrivileged(noteInfoDisplay.resourceInfo?.resourceAccessRole) ||
    (Boolean(noteInfoDisplay.ownerId) && currentUser?.id === noteInfoDisplay.ownerId);
  const annotationAsideOpen = noteInfoDisplay.commentsEnabled && resourceAsideMode === 'annotation';
  const discussionAsideOpen =
    Boolean(noteInfoDisplay.resourceInfo) && resourceAsideMode === 'discussion';
  const annotationToggleLabel = annotationAsideOpen ? '收起批注栏' : '展开批注栏';
  const discussionToggleLabel = discussionAsideOpen ? '收起讨论栏' : '展开讨论栏';

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
    if (scrollBarHideTimerRef.current !== null) {
      window.clearTimeout(scrollBarHideTimerRef.current);
      scrollBarHideTimerRef.current = null;
    }
  });

  const handleMainScroll = useMemoizedFn(() => {
    setIsMainScrolling(true);
    if (scrollBarHideTimerRef.current !== null) {
      window.clearTimeout(scrollBarHideTimerRef.current);
    }
    scrollBarHideTimerRef.current = window.setTimeout(() => {
      setIsMainScrolling(false);
      scrollBarHideTimerRef.current = null;
    }, 700);
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

  const handleOpenCommentHistory = useMemoizedFn(() => setIsCommentHistoryOpen(true));

  const noteChatStateProvider = useMemo(
    () =>
      createNoteWorkspaceChatStateProvider({
        resourceId,
        syncStatus: status,
        getClientStateVector: getNoteClientStateVector,
      }),
    [getNoteClientStateVector, resourceId, status]
  );

  const handleAskAi = useCallback(
    (selection: NoteSelectionSnapshot) => {
      setWorkspaceChatContext(createNoteSelectionChatContext(resourceId, selection));
    },
    [resourceId, setWorkspaceChatContext]
  );

  const workspaceFrameConfig = useMemo<WorkspaceLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      chatStateProvider: noteChatStateProvider,
      header: {
        resource: {
          resourceId,
          resourceName,
          resourceIconType: 'note',
          currentActions: noteInfoDisplay.resourceInfo?.currentActions,
          copyVersion: noteInfoDisplay.version,
          permissionResourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
          ownerId: noteInfoDisplay.ownerId,
          onPermissionSuccess: onRefreshNoteInfo,
          isDisabled: showFullPageSpin,
          titleMeta: (
            <span
              className={`${styles.headerSaveStatus} ${
                headerSaveStatus === 'waiting' ? styles.headerSaveStatusWaiting : ''
              } ${headerSaveStatus === 'failed' ? styles.headerSaveStatusFailed : ''}`}
            >
              {saveStatusText}
            </span>
          ),
          leadingActions: showAiDiffDisplayModeSwitch ? (
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
          ) : null,
          actions: (
            <div className={styles.headerResourceActions}>
              {noteInfoDisplay.commentsEnabled ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <ToggleButton
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      isSelected={annotationAsideOpen}
                      isDisabled={showFullPageSpin}
                      aria-label={annotationToggleLabel}
                      aria-expanded={annotationAsideOpen}
                      onChange={() => toggleResourceAsideMode(resourceId, 'annotation')}
                    >
                      <MessageSquare size={16} aria-hidden="true" />
                    </ToggleButton>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{annotationToggleLabel}</Tooltip.Content>
                </Tooltip>
              ) : null}
              {noteInfoDisplay.resourceInfo ? (
                <Tooltip>
                  <Tooltip.Trigger>
                    <ToggleButton
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      isSelected={discussionAsideOpen}
                      isDisabled={showFullPageSpin}
                      aria-label={discussionToggleLabel}
                      aria-expanded={discussionAsideOpen}
                      onChange={() => toggleResourceAsideMode(resourceId, 'discussion')}
                    >
                      <MessagesSquare size={16} aria-hidden="true" />
                    </ToggleButton>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{discussionToggleLabel}</Tooltip.Content>
                </Tooltip>
              ) : null}
            </div>
          ),
          moreMenu: {
            advanced: canManageCommentVisibility ? (
              <div className={styles.commentVisibilitySetting}>
                <div className={styles.commentVisibilityCopy}>
                  <span className={styles.commentVisibilityTitle}>隔离协作者批注</span>
                  <span className={styles.commentVisibilityDescription}>
                    开启后，协作者只能查看自己的批注。
                  </span>
                </div>
                <Switch
                  aria-label="隔离协作者批注"
                  isSelected={commentSettings.collaboratorVisibility === 'own_only'}
                  isDisabled={!isConnected}
                  onChange={(selected) => setCollaboratorVisibility(selected ? 'own_only' : 'all')}
                  size="sm"
                >
                  <Switch.Content aria-label="隔离协作者批注">
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            ) : undefined,
            showCommentHistory: noteInfoDisplay.commentsEnabled,
            onCommentHistory: handleOpenCommentHistory,
            onPrint: () => void handlePrintPdf(),
            download: {
              label: '下载为 Markdown',
              onAction: () => void handleDownloadMarkdown(),
            },
            isPending: headerMorePending,
          },
        },
      },
    }),
    [
      aiDiffDisplayMode,
      canManageCommentVisibility,
      commentSettings.collaboratorVisibility,
      annotationAsideOpen,
      annotationToggleLabel,
      discussionAsideOpen,
      discussionToggleLabel,
      handleDownloadMarkdown,
      handleOpenCommentHistory,
      handlePrintPdf,
      headerMorePending,
      isConnected,
      noteChatStateProvider,
      noteInfoDisplay.commentsEnabled,
      noteInfoDisplay.ownerId,
      noteInfoDisplay.resourceInfo,
      noteInfoDisplay.version,
      onRefreshNoteInfo,
      resourceId,
      resourceName,
      headerSaveStatus,
      saveStatusText,
      setAiDiffDisplayMode,
      setCollaboratorVisibility,
      showAiDiffDisplayModeSwitch,
      showFullPageSpin,
      toggleResourceAsideMode,
    ]
  );
  useWorkspaceLayoutConfig(workspaceFrameConfig);

  return (
    <>
      <div className={styles.mainScroll}>
        <div
          className={`${styles.contentRow} ${
            isOutlineOpen ? styles.contentRowOutlineOpen : styles.contentRowOutlineCollapsed
          }`}
        >
          <div className={styles.mainPanel}>
            <div
              className={`${styles.mainCol} ${isMainScrolling ? styles.mainColScrolling : ''}`}
              ref={mainScrollRef}
              onScroll={handleMainScroll}
            >
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
                    onSaveStatusChange={setTitleSaveStatus}
                  />
                </div>
                <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
                <div className={styles.body}>
                  {canRenderBodyEditor ? (
                    <CustomBlockNote
                      key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}-${collaborationUser.name}-${collaborationUser.color}`}
                      ref={bodyEditorRef}
                      resourceId={resourceId}
                      doc={doc}
                      provider={provider}
                      collaborationUser={collaborationUser}
                      aiDiffDisplayMode={aiDiffDisplayMode}
                      readOnly={isEditorReadOnly}
                      blockLocalDocWrites={blockLocalDocWrites}
                      onOutlineChange={setOutlineItems}
                      onActiveHeadingChange={setActiveHeadingId}
                      onAiDiffPresenceChange={handleAiDiffPresenceChange}
                      onAskAi={handleAskAi}
                      commentsEnabled={noteInfoDisplay.commentsEnabled}
                      commentsUiEnabled={isConnected && noteInfoDisplay.commentsEnabled}
                      commentsAuthorizable={noteInfoDisplay.canEditComments}
                      commentsWritable={isConnected && noteInfoDisplay.canEditComments}
                      commentUserId={currentUser?.id}
                      commentUsersById={noteInfoDisplay.authorsById}
                      isCommentVisibilityPrivileged={canManageCommentVisibility}
                      collaboratorVisibility={commentSettings.collaboratorVisibility}
                      commentsSidebarCollapsed={!annotationAsideOpen}
                      commentsSidebarWidth={resourceAsideWidth}
                      onCommentsSidebarWidthChange={(width) =>
                        setResourceAsideWidth(resourceId, width)
                      }
                      commentsSidebarPortalContainer={commentsSidebarHostElement}
                      commentHistoryOpen={isCommentHistoryOpen}
                      onCommentHistoryOpenChange={setIsCommentHistoryOpen}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {isOutlineOpen ? (
            <div className={styles.outlinePanel}>
              <aside className={styles.outlineAside} aria-label="文档目录侧栏">
                <div className={styles.outlineTopRow}>
                  <span className={styles.outlineTopTitle}>目录</span>
                  <button
                    type="button"
                    className={styles.outlineToggleBtn}
                    aria-label="收起目录"
                    onClick={() => setIsOutlineOpen(false)}
                  >
                    <ChevronsRight size={20} />
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
            </div>
          ) : (
            <div className={styles.outlineCollapsedPanel}>
              <div className={styles.outlineCollapsedCol} aria-label="展开目录">
                <Tooltip>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className={styles.outlineToggleBtn}
                      aria-label="展开目录"
                      onClick={() => setIsOutlineOpen(true)}
                    >
                      <Menu size={20} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>展开目录</Tooltip.Content>
                </Tooltip>
              </div>
            </div>
          )}

          {annotationAsideOpen ? (
            <div
              ref={setCommentsSidebarHostElement}
              className={styles.resourceAsidePanel}
              style={
                {
                  ['--note-resource-aside-width' as string]: `${resourceAsideWidth}px`,
                } as CSSProperties
              }
            />
          ) : discussionAsideOpen && noteInfoDisplay.resourceInfo ? (
            <div
              className={styles.resourceAsidePanel}
              style={
                {
                  ['--note-resource-aside-width' as string]: `${resourceAsideWidth}px`,
                } as CSSProperties
              }
            >
              <ResourceDiscussionPanel
                resource={noteInfoDisplay.resourceInfo}
                onInteractionSuccess={onRefreshNoteInfo}
              />
            </div>
          ) : null}
        </div>
      </div>

      {showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{middleOverlayText}</span>
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
  const {
    data: noteInfoDisplay,
    loading: isNoteInfoLoading,
    error: noteInfoError,
    refresh: refreshNoteInfo,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

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

  if (isNoteInfoLoading && !noteInfoDisplay) {
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
      key={resourceId}
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      onRefreshNoteInfo={refreshNoteInfo}
    />
  );
}

export default NoteView;
