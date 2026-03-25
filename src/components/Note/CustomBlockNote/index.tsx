import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { zh } from '@blocknote/core/locales';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import { NOTE_YJS_DOCUMENT_FRAGMENT } from '@/services/Note/yjs';
import { useImageService } from '@/contexts/ServicesContext';

import type { NoteEditorHandle } from '../NoteEditor/index.type';
import type { CustomBlockNoteProps } from './index.type';
import { useNoteCaptureKeyEvent } from '../NoteEditor/useNoteCaptureKeyEvent';
import { buildNoteSlashMenuItems } from './slashMenuConfig';
import { blockNoteSchema, type CustomBlockNoteEditor } from './BlockSchema/blockNoteSchema';
import { stripEscapeCharExtension, stripEscapeEditorProps } from './stripEscapeCharExtension';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

function readInsertedBlockId(insertedBlock: unknown): string | undefined {
  if (
    typeof insertedBlock === 'object' &&
    insertedBlock !== null &&
    'id' in insertedBlock &&
    typeof (insertedBlock as { id: unknown }).id === 'string'
  ) {
    return (insertedBlock as { id: string }).id;
  }
  return undefined;
}

// CustomBlockNote 组件是 NoteEditor 的子组件，用于创建 BlockNote 实例并接入 YJS 协同连接
const CustomBlockNote = forwardRef<NoteEditorHandle, CustomBlockNoteProps>(
  ({ resourceId, doc, provider, userId, cursorColor }, ref) => {
    const imageService = useImageService();
    const editorRef = useRef<CustomBlockNoteEditor | null>(null);

    const uploadFile = useCallback(
      async (file: File, insertedBlock: unknown) => {
        // 只拦截图片：非图片文件让 BlockNote 走默认行为（或抛错以阻止插入）
        if (!file.type.startsWith('image/')) {
          throw new Error('仅支持插入图片文件');
        }
        // 优先本机立刻可见 + 尽快换成公网 URL
        const blockId = readInsertedBlockId(insertedBlock);
        const previewUrl = URL.createObjectURL(file);

        void (async () => {
          try {
            const { publicUrl } = await imageService.uploadImage({
              file,
              isPublic: true,
              bizPath: `notes/${resourceId}`,
            });
            const currentEd = editorRef.current;
            if (!currentEd || blockId === undefined) {
              return;
            }
            const block = currentEd.getBlock(blockId);
            if (!block || block.type !== 'image') {
              return;
            }
            currentEd.updateBlock(block, {
              props: { ...block.props, url: publicUrl },
            });
            queueMicrotask(() => {
              URL.revokeObjectURL(previewUrl);
            });
          } catch {
            // 上传失败时保留 blob 预览，避免立刻空白；刷新后仍会丢图，可后续接 Toast / 重试
          }
        })();

        return previewUrl;
      },
      [imageService, resourceId]
    );

    const editor = useCreateBlockNote({
      schema: blockNoteSchema,
      dictionary: zh,
      trailingBlock: true,
      uploadFile,
      extensions: [stripEscapeCharExtension],
      _tiptapOptions: {
        editorProps: stripEscapeEditorProps,
      },
      collaboration: {
        provider: provider as BlockNoteCollaborationConfig['provider'],
        fragment: doc.getXmlFragment(NOTE_YJS_DOCUMENT_FRAGMENT),
        user: {
          name: userId,
          color: cursorColor,
        },
      },
    });

    editorRef.current = editor;
    useEffect(() => {
      return () => {
        editorRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor.focus();
        },
      }),
      [editor]
    );

    const onKeyDownCapture = useNoteCaptureKeyEvent(provider);

    return (
      <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
        <BlockNoteView editor={editor} theme="light" slashMenu={false}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              return filterSuggestionItems(buildNoteSlashMenuItems(editor), query);
            }}
          />
        </BlockNoteView>
      </div>
    );
  }
);

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
