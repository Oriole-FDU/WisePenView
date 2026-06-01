import { useChatService, useImageService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import {
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewNoteStore,
  useNoteSelectionStore,
} from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useCallback, useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteToolbar from '../NoteToolbar';
import { blockNoteSchema } from './blockNoteSchema';
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
  getNoteEditorPlugins,
} from './plugins';
import { syncAiDiffBlockFoldDisplayMode } from './plugins/AIDiffPlugin';
import { AiDiffDisplayModeProvider } from './plugins/AIDiffPlugin/displayModeContext';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function CustomBlockNote({
  resourceId,
  doc,
  provider,
  aiDiffDisplayMode,
  readOnly = false,
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
  const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);

  const plugins = useMemo(() => getNoteEditorPlugins(), []);
  const editorExtensions = useMemo(() => collectNoteEditorExtensions(plugins), [plugins]);
  const editorProps = useMemo(() => collectNoteEditorProps(plugins), [plugins]);

  const uploadFile = useCallback(
    async (file: File) => {
      // 只拦截图片：非图片文件让 BlockNote 走默认行为（或抛错以阻止插入）
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
    },
    [imageService, resourceId]
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
        // 单人模式下使用固定身份，避免业务层传 userId/color
        name: '',
        color: '#4096ff',
      },
    },
  });

  useMount(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, aiDiffDisplayMode);
    } catch {
      void 0;
    }
  });

  useUpdateEffect(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, aiDiffDisplayMode);
    } catch {
      void 0;
    }
  }, [aiDiffDisplayMode, editor]);

  const syncSelectedText = useCallback(() => {
    setSelectedText(resourceId, editor.getSelectedText());
  }, [editor, resourceId, setSelectedText]);

  useAttachNoteYjsUndoStack(doc, editor, undoManager);

  useMount(() => {
    syncSelectedText();
  });

  useMount(() => {
    newNoteBodyOnChangeCleanupRef.current = editor.onChange(() => {
      const isNoteEmpty = editor.blocksToMarkdownLossy().trim().length === 0;
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
  });

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
          // 再次触发 scrollIntoView，避免未滚动到可视区域
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
    }),
    [editor]
  );

  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });
  const syncActiveHeading = useCallback(() => {
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
      const flat = flatBlocksRef.current;
      activeId = resolveActiveHeadingId(flat, currentId);
    } catch {
      activeId = undefined;
    }
    onActiveHeadingChange(activeId);
  }, [editor, onActiveHeadingChange]);

  const handleSelectionChange = useCallback(() => {
    syncSelectedText();
    syncActiveHeading();
  }, [syncActiveHeading, syncSelectedText]);

  const handleAskAi = useCallback(async () => {
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
  }, [
    chatService,
    currentSessionId,
    editor,
    selectedText,
    setChatPanelCollapsed,
    setCurrentSession,
    setEnableSelectedText,
    setSelectedText,
  ]);

  return (
    <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
      <AiDiffDisplayModeProvider value={aiDiffDisplayMode}>
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
    </div>
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
