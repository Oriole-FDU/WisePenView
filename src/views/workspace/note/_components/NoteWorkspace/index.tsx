import { Spin } from '@/components/Feedback';
import InlineComment from '@/components/InlineComment';
import { AppAlertDialog } from '@/components/Overlay';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import type {
  NoteBodyEditorHandle,
  NoteOutlineItem,
} from '@/components/Note/CustomBlockNote/index.type';
import type { NoteInfoDisplayData } from '@/domains/Note';
import { encodeNoteClientContentSignature } from '@/domains/Note';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import { isDesktop } from '@/utils/platform';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Alert, Button } from '@heroui/react';
import { Download, History } from 'lucide-react';
import styles from '../../style.module.less';
import NoteInfoBar from '../NoteInfoBar';
import NoteOutline, { NOTE_OUTLINE_TITLE_ID } from '../NoteOutline';
import NoteTitle, { type NoteTitleHandle, type NoteTitleSaveStatus } from '../NoteTitle';
import { resolveNoteHeaderSaveStatus } from './noteWorkspaceModel';
import { useNoteWorkspaceController } from './useNoteWorkspaceController';

interface NoteWorkspaceProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => unknown | Promise<unknown>;
}

function NoteWorkspace({ resourceId, noteInfoDisplay, onRefreshNoteInfo }: NoteWorkspaceProps) {
  const { t } = useTranslation('note');
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
  const [findBarPortalContainer, setFindBarPortalContainer] = useState<HTMLDivElement | null>(null);
  const [aiDiffControlsPortalContainer, setAiDiffControlsPortalContainer] =
    useState<HTMLDivElement | null>(null);
  const [titleSaveStatus, setTitleSaveStatus] = useState<NoteTitleSaveStatus>('saved');
  const [pendingImageUploadCount, setPendingImageUploadCount] = useState(0);
  const fallbackNoteTitle = noteInfoDisplay.noteTitle;
  const [aiDiffBodyContentHash, setAiDiffBodyContentHash] = useState<string | undefined>(undefined);
  const noteClientContentSignature = aiDiffBodyContentHash
    ? encodeNoteClientContentSignature({ bodyHash: aiDiffBodyContentHash })
    : undefined;
  const isNoteClientContentSignaturePending = !aiDiffBodyContentHash;
  const untitledTitle = t('title.untitled');
  const resourceName = useResourceDisplayName(resourceId, fallbackNoteTitle, untitledTitle);
  const workspace = useNoteWorkspaceController({
    bodyEditorRef,
    fallbackNoteTitle,
    isNoteClientContentSignaturePending,
    noteClientContentSignature,
    noteInfoDisplay,
    resourceId,
    t,
    titleEditorRef,
    untitledTitle,
  });
  const {
    activeInlineCommentThreadId,
    blockLocalDocWrites,
    canRenderBodyEditor,
    collaborationUser,
    currentUser,
    doc,
    exportPending,
    handleAskAi,
    handleDownloadMarkdown,
    handleInlineCommentThreadSelect,
    handlePrintPdf,
    inlineCommentDraft,
    inlineCommentScrollTarget,
    inlineCommentSession,
    inlineCommentSnapshot,
    inlineCommentsBinding,
    isConnected,
    isDisconnected,
    isEditorReadOnly,
    isInlineCommentHistoryOpen,
    isTitleReadOnly,
    middleOverlayText,
    noteChatStateProvider,
    provider,
    reconnect,
    saveStatus,
    setActiveInlineCommentThreadId,
    setInlineCommentDraft,
    setIsInlineCommentHistoryOpen,
    showFullPageSpin,
    status,
  } = workspace;
  const headerSaveStatus = resolveNoteHeaderSaveStatus(saveStatus, titleSaveStatus);
  const saveStatusText = t(`save.${headerSaveStatus}`);
  const imageUploadNavigationBlocker = useBlocker(pendingImageUploadCount > 0);

  useBeforeUnload(
    (event) => {
      if (pendingImageUploadCount === 0) return;
      event.preventDefault();
      event.returnValue = '';
    },
    { capture: true }
  );
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

  /**
   * @wisepen-manual-effect
   * 执行时机：选中批注并完成侧栏布局更新后，将正文锚点平滑滚动到视口中央。
   * 不可替代原因：目标正文位置存在于 BlockNote 编辑器的命令式滚动运行时中。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (!inlineCommentScrollTarget) return;
    bodyEditorRef.current?.scrollToAnchor({
      kind: 'inlineComment',
      threadId: inlineCommentScrollTarget.threadId,
    });
  }, [inlineCommentScrollTarget]);

  const resourceHostConfig = {
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
                await inlineCommentSession.addComment(threadId, content, imageUrls, idempotencyKey);
              }}
              onReactionChange={({ threadId, itemId, emojiId, selected }) =>
                inlineCommentSession.changeReaction(threadId, itemId, emojiId, selected)
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
        leadingActions: <div ref={setAiDiffControlsPortalContainer} />,
        moreMenu: {
          actions: [
            {
              id: 'inline-comment-history',
              label: t('comments.history', {
                count:
                  inlineCommentSnapshot.resolvedThreads.length > 0
                    ? ` (${inlineCommentSnapshot.resolvedThreads.length})`
                    : '',
              }),
              icon: History,
              onAction: () => setIsInlineCommentHistoryOpen(true),
            },
          ],
          onSearch: () => bodyEditorRef.current?.openFind(),
          onPrint: handlePrintPdf,
          printLabel: isDesktop() ? t('export.downloadPdf') : t('export.printPdf'),
          printIcon: isDesktop() ? Download : undefined,
          download: {
            label: t('export.downloadMarkdown'),
            onAction: handleDownloadMarkdown,
          },
          isPending: exportPending,
        },
      },
    },
  } satisfies ResourceHostLayoutConfig;
  useResourceHostLayoutConfig(
    () => resourceHostConfig,
    [
      activeInlineCommentThreadId,
      currentUser?.id,
      exportPending,
      headerSaveStatus,
      inlineCommentDraft,
      inlineCommentSession,
      inlineCommentSnapshot,
      isInlineCommentHistoryOpen,
      noteClientContentSignature,
      noteInfoDisplay.ownerId,
      noteInfoDisplay.resourceInfo,
      noteInfoDisplay.version,
      onRefreshNoteInfo,
      resourceId,
      resourceName,
      saveStatusText,
      showFullPageSpin,
      status,
      t,
    ]
  );

  return (
    <>
      <div className={styles.mainScroll}>
        <div className={styles.findBarDock} ref={setFindBarPortalContainer} />
        <div
          className={`${styles.contentRow} ${isOutlineOpen ? styles.contentRowOutlineOpen : ''}`}
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
                      <Alert.Description>{t('workspace.disconnected')}</Alert.Description>
                    </Alert.Content>
                    <div className={styles.wsAlertAction}>
                      <Button
                        variant="secondary"
                        size="sm"
                        isDisabled={status !== 'disconnected'}
                        onPress={reconnect}
                      >
                        {t('workspace.retry')}
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
                        readOnly: isEditorReadOnly,
                        blockLocalDocWrites,
                      }}
                      onOutlineChange={setOutlineItems}
                      onActiveHeadingChange={setActiveHeadingId}
                      onAskAi={handleAskAi}
                      portalContainers={{
                        aiBulkActions: aiBulkActionsPortalContainer,
                        aiDiffControls: aiDiffControlsPortalContainer,
                        findBar: findBarPortalContainer,
                      }}
                      onAiDiffBodyContentHashChange={setAiDiffBodyContentHash}
                      onImageUploadCountChange={setPendingImageUploadCount}
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
      <AppAlertDialog
        type="warning"
        isOpen={imageUploadNavigationBlocker.state === 'blocked'}
        onOpenChange={() => imageUploadNavigationBlocker.reset?.()}
        title={t('workspace.imageUploadLeaveTitle')}
        description={t('workspace.imageUploadLeaveDescription', { count: pendingImageUploadCount })}
        footer={
          <Button variant="primary" onPress={() => imageUploadNavigationBlocker.reset?.()}>
            {t('workspace.imageUploadContinue')}
          </Button>
        }
      />
    </>
  );
}

export default NoteWorkspace;
