import { useNewNoteStore } from '@/components/Note/_store/useNewNoteStore';
import { usePendingNoteImportStore } from '@/components/Note/_store/usePendingNoteImportStore';
import { useImageService, useResourceService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import type { AiDiffDisplayMode, SelectedNoteScope } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE, computeNoteBodyContentHash } from '@/domains/Note';
import type { User } from '@/domains/User';
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
import { useLatest, useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { useNoteEditorSelectionStore } from '../_store/useNoteEditorSelectionStore';
import NoteSideMenu from '../NoteSideMenu';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteTableHandles from '../NoteTableHandles';
import NoteToolbar from '../NoteToolbar';
import { hasAiDiffContentFromEditor } from './AiDiffPresence';
import { blockNoteSchema, type CustomBlockNoteEditor } from './blockNoteSchema';
import {
  buildCommentsExtension,
  capturePendingCommentSelection,
  commentStyles,
  getBlockNoteCommentUsersYMap,
  getBlockNoteThreadsYMap,
  isCommentableSelection,
  LatexCommentProvider,
  NoteCommentsUi,
  resolveActiveCommentUserProfile,
  resolveBlockNoteCommentUsers,
  syncDomSelectionToProseMirror,
  useActiveCommentUser,
  useFormulaComments,
  useInlineCommentsSync,
  useSyncCommentDocumentMarks,
  type PendingCommentReference,
  type PendingCommentSelection,
} from './comments';
import { syncCommentUserProfileToYMap } from './comments/core/commentUserProfile';
import { mergeReadOnlyEditorProps, NoteEditorReadOnlyProvider } from './editorReadOnly';
import {
  useAttachNoteYjsUndoStack,
  useNoteCaptureKeyEvent,
  useNoteYjsFragment,
  useNoteYjsUndoManager,
} from './hooks';
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
import { useAiDiffNormalization } from './plugins/AIDiffPlugin/useAiDiffNormalization';
import { printNotePdfViaBrowser, waitForEditorPaint } from './plugins/noteBrowserPrint';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;
type CollaborationUser = {
  name: string;
  color: string;
};
type YCursorExtensionHandle = {
  updateUser?: (user: CollaborationUser) => void;
};

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

function buildSelectedNoteScope(editor: CustomBlockNoteEditor): SelectedNoteScope | null {
  const selectedBlocks = editor.getSelection()?.blocks;
  if (!selectedBlocks?.length) return null;
  const startBlockId = selectedBlocks[0]?.id;
  const endBlockId = selectedBlocks[selectedBlocks.length - 1]?.id;
  if (!startBlockId || !endBlockId) return null;
  return { type: 'blockRange', startBlockId, endBlockId };
}

function CustomBlockNoteEditor({
  resourceId,
  doc,
  provider,
  collaborationUser,
  aiDiffDisplayMode,
  collaborationReady,
  readOnly = false,
  blockLocalDocWrites = false,
  onOutlineChange,
  onActiveHeadingChange,
  onAiDiffPresenceChange,
  onAskAi,
  commentsEnabled = false,
  commentsUiEnabled,
  commentsAuthorizable = false,
  commentsWritable = false,
  commentUserId,
  commentUsersById,
  commentDocumentRole = 'editor',
  isCommentVisibilityPrivileged = false,
  collaboratorVisibility = 'all',
  commentsSidebarCollapsed = false,
  commentsSidebarWidth = 300,
  onCommentsSidebarWidthChange,
  commentsSidebarPortalContainer,
  commentHistoryOpen = false,
  onCommentHistoryOpenChange,
  aiBulkActionsPortalContainer,
  onAiDiffBodyContentHashChange,
  commentUser,
  ref,
}: CustomBlockNoteProps & { commentUser: User | null; ref?: Ref<NoteBodyEditorHandle> }) {
  const imageService = useImageService();
  const resourceService = useResourceService();
  const setCurrentSelection = useNoteEditorSelectionStore((state) => state.setCurrentSelection);
  const clearCurrentSelection = useNoteEditorSelectionStore((state) => state.clearCurrentSelection);
  const currentSelection = useNoteEditorSelectionStore(
    (state) => state.currentSelectionByResourceId[resourceId]
  );
  const newNoteBodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const flatBlocksRef = useRef<{ id: string; type: string }[]>([]);
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const effectiveBlockLocalDocWrites = blockLocalDocWrites && pmWriteGuardReady;
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const uploadFile = useMemoizedFn(async (file: File) => {
    if (readOnly) {
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
    const { publicUrl } = await imageService.uploadImage({
      file,
      scene: 'PRIVATE_IMAGE_FOR_NOTE',
      bizTag: `notes/${resourceId}`,
    });
    return publicUrl;
  });
  const [exportDisplayModeOverride, setExportDisplayModeOverride] =
    useState<AiDiffDisplayMode | null>(null);
  const effectiveAiDiffDisplayMode = exportDisplayModeOverride ?? aiDiffDisplayMode;
  const lastAiDiffPresenceRef = useRef<boolean | null>(null);
  const [hasAiDiffContent, setHasAiDiffContent] = useState(false);
  const pendingCommentReferenceRef = useRef<PendingCommentReference | null>(null);
  /** 与 reference 分离：applyPendingCommentReference 会在 createThread 时清空 reference，但 mark 仍需选区 */
  const pendingCommentSelectionRef = useRef<PendingCommentSelection | null>(null);
  const editorRef = useRef<CustomBlockNoteEditor | null>(null);
  const aiDiffBodyContentHashRef = useRef<string | undefined>(undefined);
  const aiDiffBodyContentHashTimerRef = useRef<number | null>(null);
  const commitPendingReferenceForThreadRef = useRef<(threadId: string) => void>(() => undefined);
  const rememberPendingCommentReferenceRef = useRef<() => void>(() => undefined);
  const noteFragment = useNoteYjsFragment(doc);
  const showCommentsUi = (commentsUiEnabled ?? commentsEnabled) && commentsEnabled;
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const commentUsersYMap = getBlockNoteCommentUsersYMap(doc);
  const { activeCommentUserId, activeCommentUsername, activeCommentAvatarUrl } =
    resolveActiveCommentUserProfile(commentUser, commentUserId);
  const activeCommentUserIdLatest = useLatest(activeCommentUserId);
  const commentResolverContextLatest = useLatest({
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

  useInlineCommentsSync({
    enabled: commentsEnabled,
    resourceId,
    threadsYMap,
    listInlineComments: resourceService.listInlineComments,
  });

  const plugins = useMemo(() => getNoteEditorPlugins(), []);
  const editorExtensions = useMemo(() => {
    const extensions = [
      ...collectNoteEditorExtensions(plugins),
      createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
    ];
    if (commentsEnabled) {
      extensions.push(
        // eslint-disable-next-line react-hooks/refs -- 扩展初始化早于 editor 创建，以下 ref 只在扩展运行期回调读取。
        buildCommentsExtension({
          resourceId,
          activeCommentUserId,
          getActiveCommentUserId: () => activeCommentUserIdLatest.current,
          commentsAuthorizable,
          isCommentVisibilityPrivileged,
          commentDocumentRole,
          threadsYMap,
          doc,
          resolveUsers: (userIds) =>
            Promise.resolve(
              resolveBlockNoteCommentUsers(userIds, commentResolverContextLatest.current)
            ),
          getEditor: () => editorRef.current,
          getPendingCommentSelection: () => pendingCommentSelectionRef.current,
          getPendingCommentReferenceText: () => pendingCommentReferenceRef.current?.referenceText,
          clearPendingCommentSelection: () => {
            pendingCommentSelectionRef.current = null;
          },
          onThreadDocumentMarked: (threadId) => {
            commitPendingReferenceForThreadRef.current(threadId);
          },
          canAddThreadToDocument: isCommentableSelection,
          inlineCommentDataSource: {
            listInlineComments: resourceService.listInlineComments,
            createInlineComment: resourceService.createInlineComment,
            addInlineCommentItem: resourceService.addInlineCommentItem,
            updateInlineCommentItem: resourceService.updateInlineCommentItem,
            deleteInlineCommentItem: resourceService.deleteInlineCommentItem,
            changeInlineCommentResolveStatus: resourceService.changeInlineCommentResolveStatus,
          },
        })
      );
    }
    return extensions;
  }, [
    activeCommentUserId,
    commentDocumentRole,
    commentsEnabled,
    commentsAuthorizable,
    isCommentVisibilityPrivileged,
    plugins,
    resourceId,
    resourceService,
    threadsYMap,
    doc,
    shouldBlockLocalDocWrites,
    activeCommentUserIdLatest,
    commentResolverContextLatest,
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
      user: collaborationUser,
    },
  });
  const undoManager = useNoteYjsUndoManager(noteFragment, editor);

  const refreshAiDiffBodyContentHash = useMemoizedFn(() => {
    const nextHash = computeNoteBodyContentHash(editor.document);
    aiDiffBodyContentHashRef.current = nextHash;
    onAiDiffBodyContentHashChange?.(nextHash);
  });

  const scheduleAiDiffBodyContentHashRefresh = useMemoizedFn(() => {
    aiDiffBodyContentHashRef.current = undefined;
    onAiDiffBodyContentHashChange?.(undefined);
    if (aiDiffBodyContentHashTimerRef.current !== null) {
      window.clearTimeout(aiDiffBodyContentHashTimerRef.current);
    }
    aiDiffBodyContentHashTimerRef.current = window.setTimeout(() => {
      aiDiffBodyContentHashTimerRef.current = null;
      refreshAiDiffBodyContentHash();
    }, 120);
  });

  useMount(() => {
    editorRef.current = editor;
    scheduleAiDiffBodyContentHashRefresh();
  });

  useUpdateEffect(() => {
    editorRef.current = editor;
    scheduleAiDiffBodyContentHashRefresh();
  }, [editor]);

  const syncCollaborationUser = () => {
    const yCursor = editor.getExtension('yCursor') as YCursorExtensionHandle | undefined;
    yCursor?.updateUser?.(collaborationUser);
  };

  useMount(() => {
    syncCollaborationUser();
  });

  useUpdateEffect(() => {
    syncCollaborationUser();
  }, [collaborationUser, editor]);

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

  const syncAiDiffPresence = useCallback(() => {
    const nextHasAiDiffContent = hasAiDiffContentFromEditor(editor);
    if (lastAiDiffPresenceRef.current === nextHasAiDiffContent) {
      return;
    }

    lastAiDiffPresenceRef.current = nextHasAiDiffContent;
    setHasAiDiffContent(nextHasAiDiffContent);
    onAiDiffPresenceChange?.(nextHasAiDiffContent);
  }, [editor, onAiDiffPresenceChange]);

  useAiDiffNormalization({
    doc,
    noteFragment,
    editor,
    provider,
    onNormalized: syncAiDiffPresence,
  });

  useMount(() => {
    syncAiDiffPresence();
  });

  useMount(() => {
    let writeGuardActivated = false;
    const activateWriteGuard = () => {
      if (writeGuardActivated || !hasBlockLocalDocWritesProp()) {
        return;
      }
      writeGuardActivated = true;
      setPmWriteGuardReady(true);
    };

    newNoteBodyOnChangeCleanupRef.current = editor.onChange(() => {
      activateWriteGuard();
      scheduleAiDiffBodyContentHashRefresh();

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

    if (hasBlockLocalDocWritesProp()) {
      window.requestAnimationFrame(activateWriteGuard);
    }
  });

  const applyPendingMarkdownImport = useMemoizedFn(() => {
    if (!collaborationReady) {
      return;
    }

    const pendingImport = usePendingNoteImportStore.getState().pendingByResourceId[resourceId];
    if (!pendingImport) {
      return;
    }

    try {
      const blocks = editor.tryParseMarkdownToBlocks(pendingImport.markdown);
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.success(`已导入 ${pendingImport.sourceFileName}`);
    } catch (error) {
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.danger(`Markdown 导入失败：${parseErrorMessage(error)}`);
    }
  });

  useMount(() => {
    applyPendingMarkdownImport();
  });

  useUpdateEffect(() => {
    applyPendingMarkdownImport();
  }, [collaborationReady, resourceId]);

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
    if (aiDiffBodyContentHashTimerRef.current !== null) {
      window.clearTimeout(aiDiffBodyContentHashTimerRef.current);
      aiDiffBodyContentHashTimerRef.current = null;
    }
    clearCurrentSelection(resourceId);
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
    commentUserId: activeCommentUserId,
    isCommentVisibilityPrivileged,
    collaboratorVisibility,
    pendingCommentReferenceRef,
    pendingCommentSelectionRef,
  });

  useMount(() => {
    commitPendingReferenceForThreadRef.current = commitPendingReferenceForThread;
    rememberPendingCommentReferenceRef.current = rememberPendingCommentReference;
  });

  useUpdateEffect(() => {
    commitPendingReferenceForThreadRef.current = commitPendingReferenceForThread;
    rememberPendingCommentReferenceRef.current = rememberPendingCommentReference;
  }, [commitPendingReferenceForThread, rememberPendingCommentReference]);

  useSyncCommentDocumentMarks({
    editor,
    doc,
    provider,
    commentsEnabled,
    commentUserId: activeCommentUserId,
    isCommentVisibilityPrivileged,
    collaboratorVisibility,
    onAfterDocumentMarksSync: bumpFormulaState,
  });

  useUpdateEffect(() => {
    if (!commentsEnabled || !commentsWritable) {
      return;
    }
    const extension = editor.getExtension('comments') as
      { startPendingComment?: () => void } | undefined;
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
      getAiDiffBodyContentHash: () => aiDiffBodyContentHashRef.current,
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, {
            title: options?.title,
            titleRoot: options?.titleRoot,
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
    [aiDiffDisplayMode, editor, plugins]
  );

  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  const handleSelectionChange = () => {
    setCurrentSelection(resourceId, editor.getSelectedText(), buildSelectedNoteScope(editor));
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

  const handleAskAi = () => {
    const selectedText = editor.getSelectedText().trim() || currentSelection?.text.trim() || '';
    if (!selectedText) {
      toast.info('请先选中一段文字再问 AI');
      return;
    }

    onAskAi({
      text: selectedText,
      scope: buildSelectedNoteScope(editor) ?? currentSelection?.scope ?? null,
    });
  };

  const applyAllAiDiffActions = useCallback(
    (mode: AiDiffActionMode) => {
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
    },
    [editor, readOnly, syncAiDiffPresence]
  );
  const showAiBulkActions =
    hasAiDiffContent && !readOnly && aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.COMPARE;

  const hasInlineCommentsSidebar =
    showCommentsUi && !commentsSidebarCollapsed && commentsSidebarPortalContainer === undefined;
  const editorShellStyle = hasInlineCommentsSidebar
    ? ({ ['--comments-sidebar-width' as string]: `${commentsSidebarWidth}px` } as CSSProperties)
    : undefined;
  const aiBulkActionsNode = showAiBulkActions ? (
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
  ) : null;

  return (
    <div
      className={clsx(
        styles.editorShell,
        showCommentsUi && commentStyles.editorShellWithComments,
        hasInlineCommentsSidebar && commentStyles.withCommentsSidebar
      )}
      style={editorShellStyle}
      onKeyDownCapture={onKeyDownCapture}
    >
      {aiBulkActionsPortalContainer && aiBulkActionsNode
        ? createPortal(aiBulkActionsNode, aiBulkActionsPortalContainer)
        : aiBulkActionsNode}
      <NoteEditorReadOnlyProvider value={readOnly}>
        <AiDiffDisplayModeProvider value={effectiveAiDiffDisplayMode}>
          <LatexCommentProvider {...latexCommentProviderProps}>
            <BlockNoteView
              className={commentStyles.bodyBlockNoteView}
              editor={editor}
              theme="light"
              formattingToolbar={false}
              slashMenu={false}
              sideMenu={false}
              tableHandles={false}
              comments={false}
              editable={!readOnly}
              onSelectionChange={handleSelectionChange}
            >
              <NoteToolbar
                onAskAi={handleAskAi}
                showAddComment={commentsWritable}
                onRememberPendingCommentReference={() => {
                  syncDomSelectionToProseMirror(editor);
                  rememberPendingCommentReference();
                }}
              />
              <NoteSlashMenu editor={editor} plugins={plugins} />
              <NoteSideMenu plugins={plugins} />
              <NoteTableHandles />
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
                  isCommentVisibilityPrivileged={isCommentVisibilityPrivileged}
                  collaboratorVisibility={collaboratorVisibility}
                  sidebarCollapsed={commentsSidebarCollapsed}
                  sidebarWidth={commentsSidebarWidth}
                  onSidebarWidthChange={onCommentsSidebarWidthChange ?? (() => undefined)}
                  sidebarPortalContainer={commentsSidebarPortalContainer}
                  commentHistoryOpen={commentHistoryOpen}
                  onCommentHistoryOpenChange={onCommentHistoryOpenChange ?? (() => undefined)}
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
  const commentUser = useActiveCommentUser(commentsEnabled);

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
