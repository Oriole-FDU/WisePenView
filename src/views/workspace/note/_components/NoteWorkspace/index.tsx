import { Spin } from '@/components/Feedback';
import InlineComment from '@/components/InlineComment';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useMemoizedFn, useRequest, useUnmount } from 'ahooks';
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type {
  NoteBodyEditorHandle,
  NoteCollaborationUser,
  NoteOutlineItem,
} from '@/components/Note/CustomBlockNote/index.type';
import { useInlineCommentService, useInteractService, useUserService } from '@/domains';
import type {
  AiDiffDisplayMode,
  NoteInfoDisplayData,
  NoteInlineCommentDraft,
  NoteSaveStatus,
  NoteSelectionSnapshot,
} from '@/domains/Note';
import {
  AI_DIFF_DISPLAY_MODE,
  AI_DIFF_DISPLAY_MODE_LABELS,
  encodeNoteClientContentSignature,
  NoteInlineCommentSession,
  useNoteSession,
} from '@/domains/Note';
import type { User } from '@/domains/User';
import { useEffectForce } from '@/hooks/useEffectForce';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { parseErrorMessage } from '@/utils/error';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import {
  useResourceHostChatContextActions,
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { useWorkspaceResourceSidePanelStore } from '@/views/workspace/_store/useWorkspaceResourceSidePanelStore';
import { Alert, Button, toast } from '@heroui/react';
import { History } from 'lucide-react';
import {
  createNoteChatStateProvider,
  createNoteSelectionChatContext,
} from '../../NoteChatProtocol';
import { useAiDiffDisplayStore } from '../../_store/useAiDiffDisplayStore';
import styles from '../../style.module.less';
import FindBar from '../FindBar';
import NoteInfoBar from '../NoteInfoBar';
import NoteOutline, { NOTE_OUTLINE_TITLE_ID } from '../NoteOutline';
import NoteTitle, { type NoteTitleHandle, type NoteTitleSaveStatus } from '../NoteTitle';

interface NoteWorkspaceProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => unknown | Promise<unknown>;
}

const INLINE_COMMENT_POLLING_INTERVAL = 8_000;

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

function sanitizeDownloadFileName(fileName: string): string {
  const normalizedName = fileName.trim().replace(/[\\/:*?"<>|]+/g, '_');
  const safeName = normalizedName.replace(/[.\s]+$/g, '');
  return safeName || '未命名笔记';
}

function downloadTextArtifact(params: {
  content: string;
  mimeType: string;
  fileName: string;
}): void {
  const blob = new Blob([params.content], { type: params.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = params.fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
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

function NoteWorkspace({ resourceId, noteInfoDisplay, onRefreshNoteInfo }: NoteWorkspaceProps) {
  const aiDiffDisplayMode = useAiDiffDisplayStore((state) => state.displayMode);
  const setAiDiffDisplayMode = useAiDiffDisplayStore((state) => state.setDisplayMode);
  const { setChatContext } = useResourceHostChatContextActions();
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const scrollBarHideTimerRef = useRef<number | null>(null);
  const [isMainScrolling, setIsMainScrolling] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
  const [aiBulkActionsPortalContainer, setAiBulkActionsPortalContainer] =
    useState<HTMLDivElement | null>(null);
  const [exportPending, setExportPending] = useState(false);
  const [titleSaveStatus, setTitleSaveStatus] = useState<NoteTitleSaveStatus>('saved');
  const [hasAiDiffContent, setHasAiDiffContent] = useState(false);
  const [inlineCommentDraft, setInlineCommentDraft] = useState<NoteInlineCommentDraft>();
  const [activeInlineCommentThreadId, setActiveInlineCommentThreadId] = useState<string>();
  const [inlineCommentScrollTarget, setInlineCommentScrollTarget] = useState<{
    threadId: string;
  }>();
  const [isInlineCommentHistoryOpen, setIsInlineCommentHistoryOpen] = useState(false);
  const interactService = useInteractService();
  const inlineCommentService = useInlineCommentService();
  const userService = useUserService();
  const setResourceSidePanelMode = useWorkspaceResourceSidePanelStore((state) => state.setMode);
  const inlineCommentSession = useMemo(
    () =>
      new NoteInlineCommentSession({
        resourceId,
        inlineCommentService,
      }),
    [inlineCommentService, resourceId]
  );
  const inlineCommentSnapshot = useSyncExternalStore(
    inlineCommentSession.subscribe,
    inlineCommentSession.getSnapshot
  );
  const { data: currentUser, error: currentUserError } = useRequest(() =>
    userService.getUserInfo()
  );
  const shouldWaitCurrentUser = !currentUser && !currentUserError;
  const { status, saveStatus, doc, provider, reconnect, idbSynced } = useNoteSession(resourceId, {
    actorUserId: currentUser?.id,
    enabled: !shouldWaitCurrentUser,
    localOnly: Boolean(noteInfoDisplay.aiDiffPreview),
  });
  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  const showFullPageSpin = (status === 'connecting' && !idbSynced) || shouldWaitCurrentUser;
  const middleOverlayText =
    status === 'connecting' && !idbSynced ? '正在连接笔记服务...' : '正在加载用户信息...';
  const fallbackNoteTitle = noteInfoDisplay.noteTitle;
  const [aiDiffBodyContentHash, setAiDiffBodyContentHash] = useState<string | undefined>(undefined);
  const noteClientContentSignature = useMemo(
    () =>
      aiDiffBodyContentHash
        ? encodeNoteClientContentSignature({ bodyHash: aiDiffBodyContentHash })
        : undefined,
    [aiDiffBodyContentHash]
  );
  const isNoteClientContentSignaturePending = !aiDiffBodyContentHash;
  const resourceName = useResourceDisplayName(resourceId, fallbackNoteTitle, '未命名笔记');
  const headerSaveStatus = resolveNoteHeaderSaveStatus(saveStatus, titleSaveStatus);
  const saveStatusText = formatNoteSaveStatus(headerSaveStatus);
  const collaborationUser = useMemo(() => buildNoteCollaborationUser(currentUser), [currentUser]);
  const canRenderBodyEditor = !shouldWaitCurrentUser;
  useRequest(() => interactService.recordResourceRead(resourceId), {
    refreshDeps: [resourceId],
  });

  useRequest(() => inlineCommentSession.refresh(), {
    pollingInterval: INLINE_COMMENT_POLLING_INTERVAL,
    refreshDeps: [inlineCommentSession],
  });

  useUnmount(() => inlineCommentSession.destroy());

  const focusBody = () => {
    bodyEditorRef.current?.focus();
  };

  const handleOutlineNavigate = (id: string) => {
    if (id !== NOTE_OUTLINE_TITLE_ID) {
      bodyEditorRef.current?.scrollToAnchor({ kind: 'block', blockId: id });
      return;
    }
    const anchor = titleAnchorRef.current;
    if (!anchor) {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    anchor.scrollIntoView({ block: 'start', behavior: 'smooth' });
    window.requestAnimationFrame(() => {
      anchor.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
    });
  };

  useUnmount(() => {
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

  const showAiDiffDisplayModeSwitch = hasAiDiffContent;

  const handlePrintPdf = useMemoizedFn(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    const titleApi = titleEditorRef.current;
    const title = titleApi?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
    const titleRoot = titleApi?.getProseMirrorRoot() ?? null;
    try {
      setExportPending(true);
      await bodyApi.exportPdf({ title, titleRoot });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  });

  const handleDownloadMarkdown = useMemoizedFn(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info('编辑器未就绪');
      return;
    }
    try {
      setExportPending(true);
      const title = titleEditorRef.current?.getPlainTitle() ?? fallbackNoteTitle ?? '未命名笔记';
      const artifact = bodyApi.exportMarkdown();
      downloadTextArtifact({
        content: artifact.content,
        mimeType: artifact.mimeType,
        fileName: `${sanitizeDownloadFileName(title)}.${artifact.extension}`,
      });
      toast.success('Markdown 下载已开始');
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  });

  const noteChatStateProvider = useMemo(
    () =>
      createNoteChatStateProvider({
        resourceId,
        syncStatus: status,
        isClientContentSignaturePending: isNoteClientContentSignaturePending,
        clientContentSignature: noteClientContentSignature,
      }),
    [isNoteClientContentSignaturePending, noteClientContentSignature, resourceId, status]
  );

  const handleAskAi = useCallback(
    (selection: NoteSelectionSnapshot) => {
      setChatContext(createNoteSelectionChatContext(resourceId, selection));
    },
    [resourceId, setChatContext]
  );

  const handleInlineCommentCreateRequest = useCallback(
    (draft: NoteInlineCommentDraft) => {
      setInlineCommentDraft(draft);
      setResourceSidePanelMode(resourceId, 'inlineComment');
    },
    [resourceId, setResourceSidePanelMode]
  );

  const handleInlineCommentThreadSelect = useCallback(
    (threadId: string) => {
      setActiveInlineCommentThreadId(threadId);
      setInlineCommentScrollTarget({ threadId });
      setResourceSidePanelMode(resourceId, 'inlineComment');
    },
    [resourceId, setResourceSidePanelMode]
  );

  /**
   * 执行时机：选中批注并完成侧栏布局更新后，将正文锚点平滑滚动到视口中央。
   * 不可替代原因：回调会传给子组件，React 不允许它闭包读取 ref；cleanup 无资源需要释放。
   */
  useEffectForce(() => {
    if (!inlineCommentScrollTarget) return;
    bodyEditorRef.current?.scrollToAnchor({
      kind: 'inlineComment',
      threadId: inlineCommentScrollTarget.threadId,
    });
  }, [inlineCommentScrollTarget]);

  const inlineCommentsBinding = useMemo(
    () => ({
      session: inlineCommentSession,
      onCreateRequest: handleInlineCommentCreateRequest,
      onThreadSelect: handleInlineCommentThreadSelect,
    }),
    [handleInlineCommentCreateRequest, handleInlineCommentThreadSelect, inlineCommentSession]
  );

  const resourceHostConfig = useMemo<ResourceHostLayoutConfig>(
    () => ({
      className: styles.pageWrap,
      chatStateProvider: noteChatStateProvider,
      sidePanel: noteInfoDisplay.resourceInfo
        ? {
            resource: noteInfoDisplay.resourceInfo,
            onResourceChanged: onRefreshNoteInfo,
            inlineComment: (
              <InlineComment
                threads={inlineCommentSnapshot.threads}
                resolvedThreads={inlineCommentSnapshot.resolvedThreads}
                loading={inlineCommentSnapshot.loading}
                error={inlineCommentSnapshot.error}
                isHistoryOpen={isInlineCommentHistoryOpen}
                draft={
                  inlineCommentDraft
                    ? {
                        key: `${inlineCommentDraft.anchor.start}:${inlineCommentDraft.anchor.end}`,
                        quoteText: inlineCommentDraft.quoteText,
                      }
                    : undefined
                }
                activeThreadId={activeInlineCommentThreadId}
                currentUserId={currentUser?.id}
                resourceOwnerId={noteInfoDisplay.ownerId}
                imageUpload={{
                  scene: 'PRIVATE_IMAGE_FOR_NOTE',
                  bizTag: `notes/${resourceId}/inline-comments`,
                }}
                onHistoryOpenChange={setIsInlineCommentHistoryOpen}
                onDraftClose={() => setInlineCommentDraft(undefined)}
                onThreadSelect={handleInlineCommentThreadSelect}
                onCreate={async ({ content, imageUrls, idempotencyKey }) => {
                  if (!inlineCommentDraft) return;
                  const thread = await inlineCommentSession.createThread({
                    ...inlineCommentDraft,
                    content,
                    imageUrls,
                    idempotencyKey,
                  });
                  handleInlineCommentThreadSelect(thread.threadId);
                  setInlineCommentDraft(undefined);
                }}
                onReply={async (threadId, { content, imageUrls, idempotencyKey }) => {
                  await inlineCommentSession.addComment(
                    threadId,
                    content,
                    imageUrls,
                    idempotencyKey
                  );
                }}
                onReactionChange={({ threadId, itemId, emojiId }) =>
                  inlineCommentSession.changeReaction(threadId, itemId, emojiId)
                }
                onResolve={async (threadId) => {
                  await inlineCommentSession.resolveThread(threadId);
                  setActiveInlineCommentThreadId((currentThreadId) =>
                    currentThreadId === threadId ? undefined : currentThreadId
                  );
                }}
                onReopen={(threadId) => inlineCommentSession.reopenThread(threadId)}
                onDelete={({ threadId, itemId }) =>
                  inlineCommentSession.deleteComment(threadId, itemId)
                }
              />
            ),
          }
        : undefined,
      header: {
        resource: {
          resourceId,
          resourceName,
          resourceIconType: 'note',
          currentActions: noteInfoDisplay.resourceInfo?.currentActions,
          copyVersion: noteInfoDisplay.version,
          permissionResourceType: RESOURCE_KIND.NOTE,
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
          moreMenu: {
            actions: [
              {
                id: 'inline-comment-history',
                label: `历史评论${
                  inlineCommentSnapshot.resolvedThreads.length > 0
                    ? ` (${inlineCommentSnapshot.resolvedThreads.length})`
                    : ''
                }`,
                icon: History,
                onAction: () => setIsInlineCommentHistoryOpen(true),
              },
            ],
            searchPopover: (
              <FindBar key="search-popover" editorRef={bodyEditorRef} showClose={false} />
            ),
            onPrint: handlePrintPdf,
            download: {
              label: '下载为 Markdown',
              onAction: handleDownloadMarkdown,
            },
            isPending: exportPending,
          },
        },
      },
    }),
    [
      aiDiffDisplayMode,
      handleDownloadMarkdown,
      handlePrintPdf,
      exportPending,
      noteChatStateProvider,
      noteInfoDisplay.ownerId,
      noteInfoDisplay.resourceInfo,
      noteInfoDisplay.version,
      activeInlineCommentThreadId,
      handleInlineCommentThreadSelect,
      inlineCommentDraft,
      isInlineCommentHistoryOpen,
      inlineCommentSnapshot,
      inlineCommentSession,
      currentUser?.id,
      onRefreshNoteInfo,
      resourceId,
      resourceName,
      headerSaveStatus,
      saveStatusText,
      setAiDiffDisplayMode,
      showAiDiffDisplayModeSwitch,
      showFullPageSpin,
    ]
  );
  useResourceHostLayoutConfig(resourceHostConfig);

  return (
    <>
      <div className={styles.mainScroll}>
        <div
          className={`${styles.contentRow} ${
            isOutlineOpen ? styles.contentRowOutlineOpen : styles.contentRowOutlineCollapsed
          }`}
        >
          <div className={styles.mainPanel} ref={setAiBulkActionsPortalContainer}>
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
                        isDisabled={status !== 'disconnected'}
                        onPress={reconnect}
                      >
                        重试
                      </Button>
                    </div>
                  </Alert>
                ) : null}
                <div ref={titleAnchorRef}>
                  <NoteTitle
                    key={`${resourceId}-${noteInfoDisplay.noteTitle}-${noteInfoDisplay.canCollaborativeEdit}`}
                    ref={titleEditorRef}
                    id={resourceId}
                    initialContent={noteInfoDisplay.noteTitle}
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
                      key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}`}
                      ref={bodyEditorRef}
                      resourceId={resourceId}
                      aiDiffPreview={noteInfoDisplay.aiDiffPreview}
                      collaboration={{
                        doc,
                        provider,
                        user: collaborationUser,
                        ready: isConnected,
                      }}
                      state={{
                        aiDiffDisplayMode,
                        readOnly: isEditorReadOnly,
                        blockLocalDocWrites,
                      }}
                      onOutlineChange={setOutlineItems}
                      onActiveHeadingChange={setActiveHeadingId}
                      onAiDiffPresenceChange={setHasAiDiffContent}
                      onAskAi={handleAskAi}
                      portalContainers={{
                        aiBulkActions: aiBulkActionsPortalContainer,
                      }}
                      onAiDiffBodyContentHashChange={setAiDiffBodyContentHash}
                      inlineComments={inlineCommentsBinding}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <NoteOutline
            open={isOutlineOpen}
            onOpenChange={setIsOutlineOpen}
            items={outlineItems}
            activeId={activeHeadingId}
            title={resourceName}
            onNavigate={handleOutlineNavigate}
          />
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

export default NoteWorkspace;
