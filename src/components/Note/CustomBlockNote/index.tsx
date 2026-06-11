import { useChatService, useImageService, useUserService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import type { User } from '@/domains/User';
import {
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewNoteStore,
  useNoteSelectionStore,
} from '@/store';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  parseErrorMessage,
  WisePenError,
} from '@/utils/error';
import { zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { TextSelection } from '@tiptap/pm/state';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteToolbar from '../NoteToolbar';
import { hasAiDiffContentFromEditor } from './AiDiffPresence';
import { blockNoteSchema, type CustomBlockNoteEditor } from './blockNoteSchema';
import {
  buildCommentsExtension,
  buildPrintCommentsSection,
  capturePendingCommentSelection,
  commentStyles,
  getBlockNoteCommentUsersYMap,
  getBlockNoteThreadsYMap,
  isCommentableSelection,
  LatexCommentProvider,
  NoteCommentsUi,
  resolveActiveCommentUserProfile,
  resolveBlockNoteCommentUsers,
  useFormulaComments,
  useSyncCommentDocumentMarks,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './comments';
import { syncCommentUserProfileToYMap } from './comments/commentUserProfile';
import { mergeReadOnlyEditorProps, NoteEditorReadOnlyProvider } from './editorReadOnly';
import { useAttachNoteYjsUndoStack, useNoteCaptureKeyEvent, useNoteYjsUndoManager } from './hooks';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import {
  buildFlatBlocksFromEditor,
  buildOutlineItemsFromEditor,
  resolveActiveHeadingId,
} from './Outline';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  composeNoteBlocksToMarkdownLossy,
  createNoteReadOnlyFilterExtension,
  getNoteEditorPlugins,
} from './plugins';
import {
  filterDocumentBlocksForAiDiffExport,
  syncAiDiffBlockFoldDisplayMode,
} from './plugins/AIDiffPlugin';
import { AiDiffDisplayModeProvider } from './plugins/AIDiffPlugin/displayModeContext';
import {
  applyAiDiffActionToProps,
  applyAllAiDiffActionsToContent,
  isInlineContentEffectivelyEmpty,
  type AiDiffActionMode,
} from './plugins/AIDiffPlugin/patch';
import aiDiffStyles from './plugins/AIDiffPlugin/style.module.less';
import { printNotePdfViaBrowser, waitForEditorPaint } from './plugins/noteBrowserPrint';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function sanitizeMarkdownFileName(fileName?: string): string {
  const normalizedName = (fileName ?? '').trim().replace(/[\\/:*?"<>|]+/g, '_');
  const safeName = normalizedName.replace(/[.\s]+$/g, '');
  return safeName || '未命名笔记';
}

function blockHasNestedChildren(block: { children?: readonly unknown[] }): boolean {
  return Array.isArray(block.children) && block.children.length > 0;
}

function CustomBlockNoteEditor({
  resourceId,
  doc,
  provider,
  aiDiffDisplayMode,
  readOnly = false,
  blockLocalDocWrites = false,
  onOutlineChange,
  onActiveHeadingChange,
  onAiDiffPresenceChange,
  commentsEnabled = false,
  commentsUiEnabled,
  commentsAuthorizable = false,
  commentsWritable = false,
  commentUserId,
  commentUsersById,
  commentDocumentRole = 'editor',
  isNoteOwner = false,
  collaboratorVisibility = 'all',
  commentsSidebarCollapsed = false,
  commentsSidebarWidth = 300,
  onCommentsSidebarWidthChange,
  commentHistoryOpen = false,
  onCommentHistoryOpenChange,
  commentUser,
  ref,
}: CustomBlockNoteProps & { commentUser: User | null; ref?: Ref<NoteBodyEditorHandle> }) {
  const imageService = useImageService();
  const chatService = useChatService();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setSelectedText = useNoteSelectionStore((state) => state.setSelectedText);
  const setEnableSelectedText = useNoteSelectionStore((state) => state.setEnableSelectedText);
  const selectedText = useNoteSelectionStore(
    (state) => state.selectedTextByResourceId[resourceId] ?? ''
  );
  const clearSelectedText = useNoteSelectionStore((state) => state.clearSelectedText);
  const newNoteBodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const flatBlocksRef = useRef<{ id: string; type: string }[]>([]);
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const effectiveBlockLocalDocWrites = blockLocalDocWrites && pmWriteGuardReady;
  const blockLocalDocWritesPropRef = useRef(blockLocalDocWrites);
  blockLocalDocWritesPropRef.current = blockLocalDocWrites;
  const blockLocalDocWritesRef = useRef(effectiveBlockLocalDocWrites);
  blockLocalDocWritesRef.current = effectiveBlockLocalDocWrites;
  const uploadContextRef = useRef({ imageService, resourceId, readOnly });
  uploadContextRef.current = { imageService, resourceId, readOnly };
  const uploadFile = useRef(async (file: File) => {
    const {
      imageService: imageSvc,
      resourceId: noteResourceId,
      readOnly: isReadOnly,
    } = uploadContextRef.current;
    if (isReadOnly) {
      const err = new WisePenError({
        code: FRONTEND_CLIENT_ERROR.VALIDATION,
        source: 'client',
        message: '当前笔记为只读，无法上传图片',
      });
      toast.danger(parseErrorMessage(err));
      throw err;
    }
    if (!file.type.startsWith('image/')) {
      throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
    }
    try {
      assertImageProxyUploadLimit(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      throw error;
    }
    const { publicUrl } = await imageSvc.uploadImage({
      file,
      scene: 'PRIVATE_IMAGE_FOR_NOTE',
      bizTag: `notes/${noteResourceId}`,
    });
    return publicUrl;
  }).current;
  const [exportDisplayModeOverride, setExportDisplayModeOverride] =
    useState<AiDiffDisplayMode | null>(null);
  const effectiveAiDiffDisplayMode = exportDisplayModeOverride ?? aiDiffDisplayMode;
  const lastAiDiffPresenceRef = useRef<boolean | null>(null);
  const [hasAiDiffContent, setHasAiDiffContent] = useState(false);
  const pendingCommentReferenceRef = useRef<PendingCommentReference | null>(null);
  /** 与 reference 分离：applyPendingCommentReference 会在 createThread 时清空 reference，但 mark 仍需选区 */
  const pendingCommentSelectionRef = useRef<PendingCommentSelection | null>(null);
  const editorRef = useRef<CustomBlockNoteEditor | null>(null);
  const commitPendingReferenceForThreadRef = useRef<(threadId: string) => void>(() => undefined);
  const rememberPendingCommentReferenceRef = useRef<() => void>(() => undefined);
  const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);
  const showCommentsUi = (commentsUiEnabled ?? commentsEnabled) && commentsEnabled;
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const commentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const { activeCommentUserId, activeCommentUsername, activeCommentAvatarUrl } =
    resolveActiveCommentUserProfile(commentUser, commentUserId);
  const activeCommentUserIdRef = useRef(activeCommentUserId);
  activeCommentUserIdRef.current = activeCommentUserId;

  const commentResolverContextRef = useRef({
    activeCommentUserId,
    activeCommentUsername,
    activeCommentAvatarUrl,
    commentUsersById,
    commentUsersYMap,
  });

  useUpdateEffect(() => {
    if (commentsEnabled) {
      syncCommentUserProfileToYMap(commentUsersYMap, activeCommentUserId, {
        username: activeCommentUsername,
        avatarUrl: activeCommentAvatarUrl,
      });
    }
  }, [
    activeCommentAvatarUrl,
    activeCommentUserId,
    activeCommentUsername,
    commentUsersYMap,
    commentsEnabled,
  ]);

  useUpdateEffect(() => {
    commentResolverContextRef.current = {
      activeCommentUserId,
      activeCommentUsername,
      activeCommentAvatarUrl,
      commentUsersById,
      commentUsersYMap,
    };
  }, [
    activeCommentAvatarUrl,
    activeCommentUserId,
    activeCommentUsername,
    commentUsersById,
    commentUsersYMap,
  ]);

  const plugins = useMemo(() => getNoteEditorPlugins(), []);
  const editorExtensions = useMemo(() => {
    const extensions = [
      ...collectNoteEditorExtensions(plugins),
      createNoteReadOnlyFilterExtension(() => blockLocalDocWritesRef.current),
    ];
    if (commentsEnabled) {
      extensions.push(
        buildCommentsExtension({
          activeCommentUserId,
          getActiveCommentUserId: () => activeCommentUserIdRef.current,
          commentsAuthorizable,
          isNoteOwner,
          commentDocumentRole,
          threadsYMap,
          doc,
          resolveUsers: (userIds) =>
            Promise.resolve(
              resolveBlockNoteCommentUsers(userIds, commentResolverContextRef.current)
            ),
          getEditor: () => editorRef.current,
          getPendingCommentSelection: () => pendingCommentSelectionRef.current,
          clearPendingCommentSelection: () => {
            pendingCommentSelectionRef.current = null;
          },
          onThreadDocumentMarked: (threadId) => {
            commitPendingReferenceForThreadRef.current(threadId);
          },
          canAddThreadToDocument: isCommentableSelection,
        })
      );
    }
    return extensions;
  }, [
    activeCommentUserId,
    commentDocumentRole,
    commentsEnabled,
    commentsAuthorizable,
    isNoteOwner,
    plugins,
    threadsYMap,
    doc,
  ]);
  const editorProps = useMemo(
    () => mergeReadOnlyEditorProps(collectNoteEditorProps(plugins), effectiveBlockLocalDocWrites),
    [plugins, effectiveBlockLocalDocWrites]
  );

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    dictionary: zh,
    trailingBlock: true,
    disableExtensions: ['history', 'yUndo'],
    uploadFile,
    extensions: editorExtensions,
    _tiptapOptions: {
      editorProps,
    },
    collaboration: {
      provider: provider as BlockNoteCollaborationConfig['provider'],
      fragment: noteFragment,
      user: {
        name: '',
        color: '#4096ff',
      },
    },
  });
  editorRef.current = editor;

  useUpdateEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useMount(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, effectiveAiDiffDisplayMode);
    } catch {
      void 0;
    }
  });

  useUpdateEffect(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, effectiveAiDiffDisplayMode);
    } catch {
      void 0;
    }
  }, [effectiveAiDiffDisplayMode, editor]);

  useAttachNoteYjsUndoStack(doc, editor, undoManager);

  useUpdateEffect(() => {
    try {
      editor.prosemirrorView.setProps(editorProps);
    } catch {
      void 0;
    }
  }, [editorProps, editor]);

  useMount(() => {
    setSelectedText(resourceId, editor.getSelectedText());
  });

  const syncAiDiffPresence = () => {
    const nextHasAiDiffContent = hasAiDiffContentFromEditor(editor);
    if (lastAiDiffPresenceRef.current === nextHasAiDiffContent) {
      return;
    }

    lastAiDiffPresenceRef.current = nextHasAiDiffContent;
    setHasAiDiffContent(nextHasAiDiffContent);
    onAiDiffPresenceChange?.(nextHasAiDiffContent);
  };

  useMount(() => {
    syncAiDiffPresence();
  });

  useMount(() => {
    let writeGuardActivated = false;
    const activateWriteGuard = () => {
      if (writeGuardActivated || !blockLocalDocWritesPropRef.current) {
        return;
      }
      writeGuardActivated = true;
      setPmWriteGuardReady(true);
    };

    newNoteBodyOnChangeCleanupRef.current = editor.onChange(() => {
      activateWriteGuard();

      const isNoteEmpty = composeNoteBlocksToMarkdownLossy(editor, plugins).trim().length === 0;
      useNewNoteStore.getState().syncNewNoteBodyFromEditor(resourceId, isNoteEmpty);
      syncAiDiffPresence();

      const needOutline = Boolean(onOutlineChange);
      const needFlatBlocks = Boolean(onActiveHeadingChange);
      if (needOutline || needFlatBlocks) {
        const items = needOutline ? buildOutlineItemsFromEditor(editor) : [];
        const flat = needFlatBlocks ? buildFlatBlocksFromEditor(editor) : [];
        if (needFlatBlocks) {
          flatBlocksRef.current = flat;
        }
        if (needOutline) {
          onOutlineChange?.(items);
        }
      }
    });

    if (blockLocalDocWritesPropRef.current) {
      window.requestAnimationFrame(activateWriteGuard);
    }
  });

  useUpdateEffect(() => {
    if (!blockLocalDocWrites) {
      setPmWriteGuardReady(false);
    }
  }, [blockLocalDocWrites]);

  useUnmount(() => {
    if (newNoteBodyOnChangeCleanupRef.current) {
      newNoteBodyOnChangeCleanupRef.current();
      newNoteBodyOnChangeCleanupRef.current = null;
    }
    clearSelectedText(resourceId);
  });

  const {
    latexCommentProviderProps,
    rememberPendingCommentReference,
    commitPendingReferenceForThread,
    bumpFormulaState,
    visibleThreadReferenceTexts,
    formulaThreadPositions,
  } = useFormulaComments({
    editor,
    doc,
    resourceId,
    commentsEnabled,
    commentsWritable,
    readOnly,
    pendingCommentReferenceRef,
    pendingCommentSelectionRef,
  });

  commitPendingReferenceForThreadRef.current = commitPendingReferenceForThread;
  rememberPendingCommentReferenceRef.current = rememberPendingCommentReference;

  useSyncCommentDocumentMarks({
    editor,
    doc,
    provider,
    commentsEnabled,
    onAfterDocumentMarksSync: bumpFormulaState,
  });

  useUpdateEffect(() => {
    if (!commentsEnabled || !commentsWritable) {
      return;
    }
    const extension = editor.getExtension('comments') as
      | { startPendingComment?: () => void }
      | undefined;
    if (!extension?.startPendingComment) {
      return;
    }
    const originalStartPendingComment = extension.startPendingComment.bind(extension);
    extension.startPendingComment = () => {
      rememberPendingCommentReferenceRef.current();
      originalStartPendingComment();
    };
    return () => {
      extension.startPendingComment = originalStartPendingComment;
    };
  }, [commentsEnabled, commentsWritable, editor]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor.focus();
      },
      navigateToBlock: (id: string) => {
        try {
          editor.setTextCursorPosition(id, 'start');
          editor.focus();
          const view = (
            editor as unknown as {
              prosemirrorView?: { state?: { tr?: unknown }; dispatch?: unknown };
            }
          ).prosemirrorView;
          const canScroll =
            typeof view?.dispatch === 'function' &&
            view?.state &&
            isRecord(view.state) &&
            'tr' in view.state &&
            isRecord(view.state.tr) &&
            typeof (view.state.tr as { scrollIntoView?: unknown }).scrollIntoView === 'function';
          if (canScroll) {
            window.requestAnimationFrame(() => {
              try {
                (view.dispatch as (tr: unknown) => void)(
                  (view.state as { tr: { scrollIntoView: () => unknown } }).tr.scrollIntoView()
                );
              } catch {
                void 0;
              }
            });
          }
        } catch {
          editor.focus();
        }
      },
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          const commentsSection =
            options?.includeComments && commentsEnabled
              ? buildPrintCommentsSection({
                  editor,
                  doc,
                  visibilityContext: {
                    currentUserId: activeCommentUserId,
                    isOwner: isNoteOwner,
                    collaboratorVisibility,
                  },
                  localThreadReferenceTexts: visibleThreadReferenceTexts,
                  commentUsersById,
                  commentUsersYMap,
                  formulaThreadPositions,
                })
              : null;
          await printNotePdfViaBrowser(editor, {
            title: options?.title,
            titleRoot: options?.titleRoot,
            commentsSection,
          });
        } finally {
          setExportDisplayModeOverride(null);
          try {
            syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, aiDiffDisplayMode);
          } catch {
            void 0;
          }
        }
      },
      downloadMarkdown: async (fileName?: string) => {
        const blocksForExport = filterDocumentBlocksForAiDiffExport(
          editor.document,
          AI_DIFF_DISPLAY_MODE.OLD_ONLY
        );
        const markdown = composeNoteBlocksToMarkdownLossy(
          editor,
          plugins,
          blocksForExport as typeof editor.document
        );
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${sanitizeMarkdownFileName(fileName)}.md`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      },
    }),
    [
      activeCommentUserId,
      aiDiffDisplayMode,
      collaboratorVisibility,
      commentUsersById,
      commentUsersYMap,
      commentsEnabled,
      doc,
      editor,
      formulaThreadPositions,
      isNoteOwner,
      plugins,
      visibleThreadReferenceTexts,
    ]
  );

  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  const syncDomSelectionToProseMirror = () => {
    const domSelection = editor.prosemirrorView.root.getSelection?.() ?? document.getSelection();
    if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
      return;
    }
    const editorDom = editor.prosemirrorView.dom;
    const anchorNode = domSelection.anchorNode;
    const focusNode = domSelection.focusNode;
    if (!anchorNode || !focusNode) {
      return;
    }
    const anchorElement =
      anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement;
    const focusElement =
      focusNode.nodeType === Node.ELEMENT_NODE ? focusNode : focusNode.parentElement;
    if (!anchorElement || !focusElement) {
      return;
    }
    if (!editorDom.contains(anchorElement) || !editorDom.contains(focusElement)) {
      return;
    }
    try {
      const anchor = editor.prosemirrorView.posAtDOM(anchorNode, domSelection.anchorOffset);
      const head = editor.prosemirrorView.posAtDOM(focusNode, domSelection.focusOffset);
      if (anchor === head) {
        return;
      }
      editor.prosemirrorView.dispatch(
        editor.prosemirrorView.state.tr.setSelection(
          TextSelection.create(editor.prosemirrorView.state.doc, anchor, head)
        )
      );
    } catch {
      void 0;
    }
  };

  const handleSelectionChange = () => {
    setSelectedText(resourceId, editor.getSelectedText());
    if (commentsEnabled && commentsWritable && isCommentableSelection(editor)) {
      const selection = capturePendingCommentSelection(editor);
      if (selection) {
        pendingCommentSelectionRef.current = selection;
      }
    }
    if (!onActiveHeadingChange) {
      return;
    }
    let activeId: string | undefined;
    try {
      const cursor = editor.getTextCursorPosition();
      const currentId = cursor.block?.id;
      if (!currentId) {
        onActiveHeadingChange(undefined);
        return;
      }
      activeId = resolveActiveHeadingId(flatBlocksRef.current, currentId);
    } catch {
      activeId = undefined;
    }
    onActiveHeadingChange(activeId);
  };

  const handleAskAi = async () => {
    let targetSessionId = currentSessionId;
    const selectedSnapshot = editor.getSelectedText().trim() || selectedText.trim();
    if (!selectedSnapshot) {
      toast.info('请先选中一段文字再问 AI');
      return;
    }

    if (!targetSessionId) {
      try {
        const createdSession = await chatService.createSession();
        targetSessionId = createdSession.id;
        setCurrentSession({ id: createdSession.id, title: createdSession.title });
      } catch (error) {
        const text = error instanceof Error ? error.message : '新建聊天失败';
        toast.danger(text);
        return;
      }
    }

    useNoteSelectionStore.getState().setSelectedText(targetSessionId, selectedSnapshot);
    setEnableSelectedText(targetSessionId, true);
    setChatPanelCollapsed(false);
  };

  const applyAllAiDiffActions = (mode: AiDiffActionMode) => {
    if (readOnly) {
      return;
    }

    const blocks: Parameters<Parameters<typeof editor.forEachBlock>[0]>[0][] = [];
    editor.forEachBlock((block) => {
      blocks.push(block);
      return true;
    });

    const updates: Array<{
      block: (typeof blocks)[number];
      update: Parameters<typeof editor.updateBlock>[1];
    }> = [];
    const blocksToRemove: Parameters<typeof editor.removeBlocks>[0] = [];

    for (const block of blocks) {
      const propsAction = applyAiDiffActionToProps(block.props, mode);
      const nextContent = applyAllAiDiffActionsToContent(block.content, mode);

      if (propsAction.kind === 'remove') {
        blocksToRemove.push(block);
        continue;
      }

      if (nextContent && isInlineContentEffectivelyEmpty(nextContent)) {
        if (!blockHasNestedChildren(block)) {
          blocksToRemove.push(block);
          continue;
        }
      }

      if (!nextContent && propsAction.kind !== 'update') {
        continue;
      }

      updates.push({
        block,
        update: {
          ...(nextContent ? { content: nextContent } : {}),
          ...(propsAction.kind === 'update' ? { props: propsAction.props } : {}),
        } as Parameters<typeof editor.updateBlock>[1],
      });
    }

    for (const item of updates) {
      try {
        editor.updateBlock(item.block, item.update);
      } catch {
        void 0;
      }
    }

    for (let i = blocksToRemove.length - 1; i >= 0; i -= 1) {
      try {
        const block = blocksToRemove[i];
        if (block) {
          editor.removeBlocks([block]);
        }
      } catch {
        void 0;
      }
    }

    editor.focus();
    syncAiDiffPresence();
  };
  const showAiBulkActions =
    hasAiDiffContent && !readOnly && aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.COMPARE;

  const editorShellStyle =
    showCommentsUi && !commentsSidebarCollapsed
      ? ({ ['--comments-sidebar-width' as string]: `${commentsSidebarWidth}px` } as CSSProperties)
      : undefined;

  return (
    <div
      className={clsx(
        styles.editorShell,
        showCommentsUi && commentStyles.editorShellWithComments,
        showCommentsUi && !commentsSidebarCollapsed && commentStyles.withCommentsSidebar
      )}
      style={editorShellStyle}
      onKeyDownCapture={onKeyDownCapture}
    >
      {showAiBulkActions ? (
        <div className={styles.aiBulkActions} contentEditable={false}>
          <button
            type="button"
            aria-label="Keep all AI changes"
            className={`${aiDiffStyles.aiActionBtn} ${aiDiffStyles.aiActionAccept} ${styles.aiBulkActionBtn}`}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              applyAllAiDiffActions('accept');
            }}
          >
            Keep all
          </button>
          <button
            type="button"
            aria-label="Undo all AI changes"
            className={`${aiDiffStyles.aiActionBtn} ${aiDiffStyles.aiActionDiscard} ${styles.aiBulkActionBtn}`}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              applyAllAiDiffActions('discard');
            }}
          >
            Undo all
          </button>
        </div>
      ) : null}
      <NoteEditorReadOnlyProvider value={readOnly}>
        <AiDiffDisplayModeProvider value={effectiveAiDiffDisplayMode}>
          <LatexCommentProvider {...latexCommentProviderProps}>
            <BlockNoteView
              className={commentStyles.bodyBlockNoteView}
              editor={editor}
              theme="light"
              formattingToolbar={false}
              slashMenu={false}
              comments={false}
              editable={!readOnly}
              onSelectionChange={handleSelectionChange}
            >
              <NoteToolbar
                onAskAi={handleAskAi}
                showAddComment={commentsWritable}
                onRememberPendingCommentReference={() => {
                  syncDomSelectionToProseMirror();
                  rememberPendingCommentReference();
                }}
              />
              <NoteSlashMenu editor={editor} plugins={plugins} />
              {showCommentsUi ? (
                <NoteCommentsUi
                  editor={editor}
                  doc={doc}
                  commentsEnabled={commentsEnabled}
                  commentsWritable={commentsWritable}
                  commentUserId={activeCommentUserId}
                  commentUsername={activeCommentUsername}
                  commentAvatarUrl={activeCommentAvatarUrl}
                  commentUsersById={commentUsersById}
                  isNoteOwner={isNoteOwner}
                  collaboratorVisibility={collaboratorVisibility}
                  sidebarCollapsed={commentsSidebarCollapsed}
                  sidebarWidth={commentsSidebarWidth}
                  onSidebarWidthChange={onCommentsSidebarWidthChange ?? (() => undefined)}
                  commentHistoryOpen={commentHistoryOpen}
                  onCommentHistoryOpenChange={onCommentHistoryOpenChange ?? (() => undefined)}
                  pendingCommentReferenceRef={pendingCommentReferenceRef}
                  localThreadReferenceTexts={visibleThreadReferenceTexts}
                  formulaThreadPositions={formulaThreadPositions}
                  onBumpThreadsSidebar={bumpFormulaState}
                />
              ) : null}
            </BlockNoteView>
          </LatexCommentProvider>
        </AiDiffDisplayModeProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}

function CustomBlockNote(props: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const { ref, commentsEnabled = false, ...rest } = props;
  const userService = useUserService();
  const [commentUser, setCommentUser] = useState<User | null>(null);
  const commentUserRequestSeqRef = useRef(0);

  const syncCommentUser = () => {
    const requestSeq = commentUserRequestSeqRef.current + 1;
    commentUserRequestSeqRef.current = requestSeq;

    if (!commentsEnabled) {
      setCommentUser(null);
      return;
    }

    void userService
      .getUserInfo()
      .then((user) => {
        if (commentUserRequestSeqRef.current === requestSeq) {
          setCommentUser(user);
        }
      })
      .catch(() => {
        if (commentUserRequestSeqRef.current === requestSeq) {
          setCommentUser(null);
        }
      });
  };

  useMount(() => {
    syncCommentUser();
  });

  useUpdateEffect(() => {
    syncCommentUser();
  }, [commentsEnabled, userService]);

  useUnmount(() => {
    commentUserRequestSeqRef.current += 1;
  });

  return (
    <CustomBlockNoteEditor
      key={rest.resourceId}
      {...rest}
      commentsEnabled={commentsEnabled}
      ref={ref}
      commentUser={commentUser}
    />
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
