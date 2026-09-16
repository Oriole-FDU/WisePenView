import type { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

import { useImageService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';

import type { CustomBlockNoteProps } from '../index.type';
import type { CustomBlockNoteEditor } from '../registry/noteEditorComposition';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type NoteUploadFile = NonNullable<CreateBlockNoteOptions['uploadFile']>;
type NoteUploadEndHandler = (blockId: string | undefined) => void;
type NoteImageUploadEditor = CustomBlockNoteEditor & {
  onUploadEnd: (handler: NoteUploadEndHandler) => () => void;
};

interface NoteImageUploadTask {
  failed: boolean;
}

export interface NoteImageUploadRuntime {
  pendingCount: number;
  uploadFile: NoteUploadFile;
  finishUpload: (blockId: string | undefined) => boolean;
  dispose: () => void;
}

export function useNoteImageUploadRuntime({
  resourceId,
  readOnly,
  onPendingCountChange,
}: {
  resourceId: string;
  readOnly: boolean;
  onPendingCountChange?: CustomBlockNoteProps['onImageUploadCountChange'];
}): NoteImageUploadRuntime {
  const imageService = useImageService();
  const tasksRef = useRef(new Map<string, NoteImageUploadTask>());
  const [pendingCount, setPendingCount] = useState(0);

  const syncPendingCount = useMemoizedFn(() => {
    const count = tasksRef.current.size;
    setPendingCount(count);
    onPendingCountChange?.(count);
  });

  const startUpload = useMemoizedFn((blockId: string | undefined) => {
    if (!blockId) return;
    tasksRef.current.set(blockId, { failed: false });
    syncPendingCount();
  });

  const markUploadFailed = useMemoizedFn((blockId: string | undefined) => {
    if (!blockId) return;
    const task = tasksRef.current.get(blockId);
    if (task) task.failed = true;
  });

  const finishUpload = useMemoizedFn((blockId: string | undefined) => {
    if (!blockId) return false;
    const task = tasksRef.current.get(blockId);
    if (!task) return false;
    tasksRef.current.delete(blockId);
    syncPendingCount();
    return task.failed;
  });

  const dispose = useMemoizedFn(() => {
    tasksRef.current.clear();
    syncPendingCount();
  });

  const uploadFile = useMemoizedFn<NoteUploadFile>(async (file, blockId) => {
    startUpload(blockId);

    try {
      if (readOnly) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_READ_ONLY_IMAGE_UPLOAD);
      }
      if (!file.type.startsWith('image/')) {
        throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
      }

      assertImageProxyUploadLimit(file);
      const { publicUrl } = await imageService.uploadImage({
        file,
        scene: 'PRIVATE_IMAGE_FOR_NOTE',
        bizTag: `notes/${resourceId}`,
      });
      return publicUrl;
    } catch (error) {
      markUploadFailed(blockId);
      toast.danger(parseErrorMessage(error));
      throw error;
    }
  });

  useUnmount(dispose);

  return {
    pendingCount,
    uploadFile,
    finishUpload,
    dispose,
  };
}

export function useNoteImageUploadEditorBinding({
  editor,
  runtime,
}: {
  editor: CustomBlockNoteEditor;
  runtime: NoteImageUploadRuntime;
}) {
  const cleanupTimersRef = useRef<number[]>([]);
  const { finishUpload } = runtime;

  /**
   * @wisepen-manual-effect
   * 执行时机：编辑器实例就绪后订阅 BlockNote 文件上传结束事件。
   * 不可替代原因：BlockNote 会先插入空图片块再异步上传，失败块清理依赖编辑器命令式事件。
   * cleanup：取消事件订阅和仍未执行的延迟清理任务。
   */
  useEffect(() => {
    const uploadEditor = editor as NoteImageUploadEditor;
    const unsubscribe = uploadEditor.onUploadEnd((blockId) => {
      const timer = window.setTimeout(() => {
        cleanupTimersRef.current = cleanupTimersRef.current.filter((item) => item !== timer);
        if (!finishUpload(blockId)) return;
        if (!blockId) return;

        const block = editor.getBlock(blockId);
        if (block && 'url' in block.props && !block.props.url) {
          editor.removeBlocks([blockId]);
        }
      }, 0);
      cleanupTimersRef.current.push(timer);
    });

    return () => {
      unsubscribe();
      cleanupTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      cleanupTimersRef.current = [];
    };
  }, [editor, finishUpload]);
}
