import { useChatService, useImageService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
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
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useCallback, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import NoteSideMenu from '../NoteSideMenu';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteTableHandles from '../NoteTableHandles';
import NoteToolbar from '../NoteToolbar';
import { hasAiDiffContentFromEditor } from './AiDiffPresence';
import { blockNoteSchema } from './blockNoteSchema';
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

function CustomBlockNote({
  resourceId,
  doc,
  provider,
  aiDiffDisplayMode,
  readOnly = false,
  blockLocalDocWrites = false,
  onOutlineChange,
  onActiveHeadingChange,
  onAiDiffPresenceChange,
  ref,
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
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
  const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);

  const plugins = useMemo(() => getNoteEditorPlugins(), []);
  const editorExtensions = useMemo(
    () => [
      ...collectNoteEditorExtensions(plugins),
      createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
    ],
    [plugins, shouldBlockLocalDocWrites]
  );
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

  const syncAiDiffPresence = useCallback(() => {
    const nextHasAiDiffContent = hasAiDiffContentFromEditor(editor);
    if (lastAiDiffPresenceRef.current === nextHasAiDiffContent) {
      return;
    }

    lastAiDiffPresenceRef.current = nextHasAiDiffContent;
    setHasAiDiffContent(nextHasAiDiffContent);
    onAiDiffPresenceChange?.(nextHasAiDiffContent);
  }, [editor, onAiDiffPresenceChange, setHasAiDiffContent]);

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
    setSelectedText(resourceId, editor.getSelectedText());
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

    setSelectedText(targetSessionId, selectedSnapshot);
    setEnableSelectedText(targetSessionId, true);
    setChatPanelCollapsed(false);
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

  return (
    <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
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
          <BlockNoteView
            editor={editor}
            theme="light"
            formattingToolbar={false}
            slashMenu={false}
            sideMenu={false}
            tableHandles={false}
            editable={!readOnly}
            onSelectionChange={handleSelectionChange}
          >
            <NoteToolbar onAskAi={handleAskAi} />
            <NoteSlashMenu editor={editor} plugins={plugins} />
            <NoteSideMenu plugins={plugins} />
            <NoteTableHandles />
          </BlockNoteView>
        </AiDiffDisplayModeProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
