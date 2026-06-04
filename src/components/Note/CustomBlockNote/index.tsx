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
import { createExtension } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteToolbar from '../NoteToolbar';
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
  getNoteEditorPlugins,
} from './plugins';
import {
  filterDocumentBlocksForAiDiffExport,
  syncAiDiffBlockFoldDisplayMode,
} from './plugins/AIDiffPlugin';
import { AiDiffDisplayModeProvider } from './plugins/AIDiffPlugin/displayModeContext';
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

function CustomBlockNote({
  resourceId,
  doc,
  provider,
  aiDiffDisplayMode,
  readOnly = false,
  blockLocalDocWrites = false,
  onOutlineChange,
  onActiveHeadingChange,
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
  const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);

  const plugins = useMemo(() => getNoteEditorPlugins(), []);
  const editorExtensions = useMemo(
    () => [
      ...collectNoteEditorExtensions(plugins),
      createExtension({
        key: 'noteReadOnlyFilter',
        prosemirrorPlugins: [
          new Plugin({
            key: new PluginKey('noteReadOnlyFilter'),
            filterTransaction(tr) {
              if (!blockLocalDocWritesRef.current) {
                return true;
              }
              if (!tr.docChanged) {
                return true;
              }
              if (tr.getMeta('y-sync$') !== undefined) {
                return true;
              }
              if (tr.getMeta('addToHistory') === false) {
                return true;
              }
              return false;
            },
          }),
        ],
      }),
    ],
    [plugins]
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

  return (
    <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
      <NoteEditorReadOnlyProvider value={readOnly}>
        <AiDiffDisplayModeProvider value={effectiveAiDiffDisplayMode}>
          <BlockNoteView
            editor={editor}
            theme="light"
            formattingToolbar={false}
            slashMenu={false}
            editable={!readOnly}
            onSelectionChange={handleSelectionChange}
          >
            <NoteToolbar onAskAi={handleAskAi} />
            <NoteSlashMenu editor={editor} plugins={plugins} />
          </BlockNoteView>
        </AiDiffDisplayModeProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
