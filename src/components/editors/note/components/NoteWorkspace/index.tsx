import { Alert } from '@heroui/react';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { Download, History } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import { registerGuideActionHandler } from '@/components/base/Guide';
import InlineComment from '@/components/business/InlineComment';
import EditorPresentationBinding from '@/components/editors/_runtime/EditorPresentationBinding';
import type { EditorPresentation } from '@/components/editors/editor.type';
import CustomBlockNote from '@/components/editors/note/CustomBlockNote';
import type {
  NoteBodyEditorHandle,
  NoteOutlineItem,
} from '@/components/editors/note/CustomBlockNote/index.type';
import { NoteEditorSlot } from '@/components/editors/note/CustomBlockNote/NoteEditorSession';
import { useNoteEditorStatus } from '@/components/editors/note/CustomBlockNote/useNoteEditorStatus';
import { GUIDE_ACTION_ID } from '@/constants/tour';
import { useInteractService } from '@/domains';
import type { NoteInfoDisplayData } from '@/domains/Note';
import { encodeNoteClientContentSignature } from '@/domains/Note';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { isDesktop } from '@/utils/platform';

import { useEditorSurface } from '../../../_context';
import { waitForEditor } from '../../../_runtime/editorRuntime';
import { useEditorRuntime } from '../../../_runtime/useEditorRuntime';
import styles from '../../style.module.scss';
import NoteInfoBar from '../NoteInfoBar';
import NoteOutline, { NOTE_OUTLINE_TITLE_ID } from '../NoteOutline';
import NoteTitle, { type NoteTitleHandle, type NoteTitleSaveStatus } from '../NoteTitle';
import { resolveNoteHeaderSaveStatus } from './noteWorkspaceModel';
import { useNoteActionsController } from './useNoteActionsController';
import { useNoteCommentsController } from './useNoteCommentsController';
import { useNoteExternalNavigationController } from './useNoteExternalNavigationController';

interface NoteWorkspaceProps {
  resourceId: string;
  noteInfoDisplay: NoteInfoDisplayData;
  onRefreshNoteInfo: () => unknown | Promise<unknown>;
}

function NoteWorkspace({ resourceId, noteInfoDisplay, onRefreshNoteInfo }: NoteWorkspaceProps) {
  const { t } = useTranslation('note');
  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const titleEditorRef = useRef<NoteTitleHandle>(null);
  const scrollBarHideTimerRef = useRef<number | null>(null);
  const [isMainScrolling, setIsMainScrolling] = useState(false);
  // 目录默认收起，避免挤占正文空间，用户仍可手动展开
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [outlineItems, setOutlineItems] = useState<NoteOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>(undefined);
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
  const session = useNoteEditorStatus();
  const comments = useNoteCommentsController(resourceId);
  const actions = useNoteActionsController({
    bodyEditorRef,
    fallbackNoteTitle,
    isNoteClientContentSignaturePending,
    noteClientContentSignature,
    resourceId,
    t,
    titleEditorRef,
    untitledTitle,
    status: session.status,
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：目录展开状态变化时同步注册引导动作。
   * 不可替代原因：引导层直接调用目录状态 setter，不依赖对收起/展开按钮的模拟点击。
   * cleanup：撤销动作处理器。
   */
  useEffect(
    () =>
      registerGuideActionHandler(GUIDE_ACTION_ID.openOutline, {
        isOpen: () => isOutlineOpen,
        open: () => setIsOutlineOpen(true),
        close: () => setIsOutlineOpen(false),
      }),
    [isOutlineOpen]
  );
  const interactService = useInteractService();
  useApi(() => interactService.recordResourceRead(resourceId), { refreshDeps: [resourceId] });
  const headerSaveStatus = resolveNoteHeaderSaveStatus(session.saveStatus, titleSaveStatus);
  const saveStatusText = t(`save.${headerSaveStatus}`);
  const { target } = useEditorSurface();
  useEditorRuntime(
    {
      openedResource: { ...target, resourceName, version: noteInfoDisplay.version },
      loading: session.showFullPageSpin,
      readOnly: !noteInfoDisplay.canCollaborativeEdit,
      hasUnsavedChanges: headerSaveStatus !== 'saved',
      pendingWork: pendingImageUploadCount > 0,
      warnBeforeUnload: pendingImageUploadCount > 0,
    },
    async (context, editor) => {
      if (!editor.getSnapshot().pendingWork) return true;
      const done = waitForEditor(editor, (snapshot) => !snapshot.pendingWork, context.signal);
      const cancelled = context
        .confirm({
          warning: true,
          title: t('workspace.imageUploadLeaveTitle'),
          description: t('workspace.imageUploadLeaveDescription', {
            count: pendingImageUploadCount,
          }),
          confirmText: t('workspace.imageUploadContinue'),
        })
        .then(() => false);
      return Promise.race([done, cancelled]);
    }
  );
  const focusBody = () => {
    bodyEditorRef.current?.focus();
  };

  // chat 原文链接的定位请求：命中时滚动并高亮，超时后提示
  useNoteExternalNavigationController({ bodyEditorRef, resourceId });

  const handleOutlineNavigate = (id: string) => {
    if (id !== NOTE_OUTLINE_TITLE_ID) {
      bodyEditorRef.current?.scrollToAnchor({ kind: 'block', blockId: id });
      return;
    }
    titleEditorRef.current?.scrollIntoView();
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
    if (!comments.scrollTarget) return;
    bodyEditorRef.current?.scrollToAnchor({
      kind: 'inlineComment',
      threadId: comments.scrollTarget.threadId,
    });
  }, [comments.scrollTarget]);

  const workspaceProps = {
    chat: { provider: actions.chatProvider },
    className: styles.pageWrap,
    sidePanel: noteInfoDisplay.resourceInfo
      ? {
          resource: noteInfoDisplay.resourceInfo,
          onResourceChanged: onRefreshNoteInfo,
          inlineComment: (
            <InlineComment
              {...comments.panel}
              currentUserId={session.currentUser?.id}
              resourceOwnerId={noteInfoDisplay.ownerId}
              imageUpload={{
                scene: 'PRIVATE_IMAGE_FOR_NOTE',
                bizTag: `notes/${resourceId}/inline-comments`,
              }}
            />
          ),
        }
      : undefined,
    header: {
      resource: {
        resourceId,
        resourceName,
        resourceIconType: 'note',
        resourceInfo: noteInfoDisplay.resourceInfo,
        currentActions: noteInfoDisplay.resourceInfo?.currentActions,
        copyVersion: noteInfoDisplay.version,
        permissionResourceType: RESOURCE_KIND.NOTE,
        ownerId: noteInfoDisplay.ownerId,
        onPermissionSuccess: onRefreshNoteInfo,
        isDisabled: session.showFullPageSpin,
        titleMeta: (
          <span
            className={`${styles.headerSaveStatus} ${
              headerSaveStatus === 'waiting' ? styles.headerSaveStatusWaiting : ''
            } ${headerSaveStatus === 'failed' ? styles.headerSaveStatusFailed : ''}`}
          >
            {saveStatusText}
          </span>
        ),
        leadingActions: <NoteEditorSlot name="aiDiffControls" />,
        moreMenu: {
          actions: [
            {
              id: 'inline-comment-history',
              label: t('comments.history', {
                count:
                  comments.panel.resolvedThreads.length > 0
                    ? ` (${comments.panel.resolvedThreads.length})`
                    : '',
              }),
              icon: History,
              onAction: comments.openHistory,
            },
          ],
          onSearch: () => bodyEditorRef.current?.openFind(),
          onPrint: actions.printPdf,
          printLabel: isDesktop() ? t('export.downloadPdf') : t('export.printPdf'),
          printIcon: isDesktop() ? Download : undefined,
          download: {
            label: t('export.downloadMarkdown'),
            onAction: actions.downloadMarkdown,
          },
          downloadDocx: {
            label: t('export.downloadDocx'),
            onAction: actions.downloadDocx,
          },
          isPending: actions.exportPending,
        },
      },
    },
  } satisfies EditorPresentation;
  return (
    <>
      <EditorPresentationBinding {...workspaceProps} />
      <div className={styles.mainScroll}>
        <NoteEditorSlot name="findBar" className={styles.findBarDock} />
        <div
          className={`${styles.contentRow} ${isOutlineOpen ? styles.contentRowOutlineOpen : ''}`}
        >
          <NoteEditorSlot name="aiBulkActions" className={styles.mainPanel}>
            <div
              className={`${styles.mainCol} ${isMainScrolling ? styles.mainColScrolling : ''}`}
              onScroll={handleMainScroll}
            >
              <div className={styles.root}>
                {session.isDisconnected ? (
                  <Alert className={styles.wsAlert} status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{t('workspace.disconnected')}</Alert.Description>
                    </Alert.Content>
                    <div className={styles.wsAlertAction}>
                      <AppButton
                        variant="secondary"
                        size="sm"
                        isDisabled={session.status !== 'disconnected'}
                        onPress={session.reconnect}
                      >
                        {t('workspace.retry')}
                      </AppButton>
                    </div>
                  </Alert>
                ) : null}
                <NoteEditorSlot name="title">
                  <NoteTitle
                    key={`${resourceId}-${noteInfoDisplay.noteTitle}-${noteInfoDisplay.canCollaborativeEdit}`}
                    ref={titleEditorRef}
                    id={resourceId}
                    initialContent={noteInfoDisplay.noteTitle}
                    readOnly={session.isTitleReadOnly}
                    focusOnMount={session.isConnected && !session.isTitleReadOnly}
                    onEnterKey={focusBody}
                    onSaveStatusChange={setTitleSaveStatus}
                  />
                </NoteEditorSlot>
                <NoteInfoBar noteInfoDisplay={noteInfoDisplay} />
                <div className={styles.body}>
                  {session.canRenderBodyEditor ? (
                    <CustomBlockNote
                      key={`${resourceId}-${noteInfoDisplay.canCollaborativeEdit}`}
                      ref={bodyEditorRef}
                      onOutlineChange={setOutlineItems}
                      onActiveHeadingChange={setActiveHeadingId}
                      onAskAi={actions.askAi}
                      onAiDiffBodyContentHashChange={setAiDiffBodyContentHash}
                      onImageUploadCountChange={setPendingImageUploadCount}
                      inlineComments={comments.binding}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </NoteEditorSlot>

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

      {session.showFullPageSpin ? (
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>{session.middleOverlayText}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default NoteWorkspace;
