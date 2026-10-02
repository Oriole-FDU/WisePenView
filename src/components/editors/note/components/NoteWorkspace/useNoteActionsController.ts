import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import type { TFunction } from 'i18next';
import { type RefObject, useEffect, useState } from 'react';

import type { NoteBodyEditorHandle } from '@/components/editors/note/CustomBlockNote/index.type';
import type { NoteSelectionSnapshot, NoteSessionStatus } from '@/domains/Note';
import { clearFrontendStates, FRONTEND_STATE_SOURCE, setFrontendStates } from '@/frontendState';
import { parseErrorMessage } from '@/utils/error';

import { useEditorSurface } from '../../../_context';
import {
  createNoteChatStateProvider,
  createNoteSelectionChatContext,
} from '../../NoteChatProtocol';
import type { NoteTitleHandle } from '../NoteTitle';
import { downloadTextArtifact, sanitizeDownloadFileName } from './noteWorkspaceModel';

interface UseNoteActionsControllerOptions {
  bodyEditorRef: RefObject<NoteBodyEditorHandle | null>;
  fallbackNoteTitle: string;
  isNoteClientContentSignaturePending: boolean;
  status: NoteSessionStatus;
  noteClientContentSignature: string | undefined;
  resourceId: string;
  t: TFunction<'note'>;
  titleEditorRef: RefObject<NoteTitleHandle | null>;
  untitledTitle: string;
}

export function useNoteActionsController({
  bodyEditorRef,
  fallbackNoteTitle,
  isNoteClientContentSignaturePending,
  status,
  noteClientContentSignature,
  resourceId,
  t,
  titleEditorRef,
  untitledTitle,
}: UseNoteActionsControllerOptions) {
  const { openChatPanel, setChatContext } = useEditorSurface().host;
  const [exportPending, setExportPending] = useState(false);
  /**
   * @wisepen-manual-effect
   * 执行时机：笔记资源或内容签名变化时同步发送状态。
   * 不可替代原因：签名来自当前编辑器实例，聊天面板可能独立挂载。
   * cleanup：仅清理该编辑器版本写入的签名。
   */
  useEffect(() => {
    const revision = setFrontendStates({
      source: FRONTEND_STATE_SOURCE.NOTE_EDITOR,
      resourceId,
      entries: noteClientContentSignature
        ? [
            {
              key: 'note_client_content_signature',
              value: noteClientContentSignature,
              disabled: true,
            },
          ]
        : [],
    });
    return () =>
      clearFrontendStates({
        source: FRONTEND_STATE_SOURCE.NOTE_EDITOR,
        revision,
      });
  }, [noteClientContentSignature, resourceId]);
  const handlePrintPdf = useMemoizedFn(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info(t('export.editorNotReady'));
      return;
    }
    const titleApi = titleEditorRef.current;
    const title = titleApi?.getPlainTitle() ?? fallbackNoteTitle ?? untitledTitle;
    try {
      setExportPending(true);
      await bodyApi.exportPdf({
        title,
        defaultFileName: `${sanitizeDownloadFileName(title, untitledTitle)}.pdf`,
      });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  });

  const handleDownloadMarkdown = useMemoizedFn(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info(t('export.editorNotReady'));
      return;
    }
    try {
      setExportPending(true);
      const title = titleEditorRef.current?.getPlainTitle() ?? fallbackNoteTitle ?? untitledTitle;
      const artifact = bodyApi.exportMarkdown();
      downloadTextArtifact({
        content: artifact.content,
        mimeType: artifact.mimeType,
        fileName: `${sanitizeDownloadFileName(title, untitledTitle)}.${artifact.extension}`,
      });
      toast.success(t('export.markdownStarted'));
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  });

  const noteChatStateProvider = createNoteChatStateProvider({
    resourceId,
    syncStatus: status,
    isClientContentSignaturePending: isNoteClientContentSignaturePending,
  });

  const handleAskAi = useMemoizedFn((selection: NoteSelectionSnapshot) => {
    const { context, entries } = createNoteSelectionChatContext(resourceId, selection);
    setFrontendStates({
      source: FRONTEND_STATE_SOURCE.SELECTION,
      resourceId,
      entries,
    });
    setChatContext(context);
    openChatPanel();
  });

  return {
    exportPending,
    printPdf: handlePrintPdf,
    downloadMarkdown: handleDownloadMarkdown,
    chatProvider: noteChatStateProvider,
    askAi: handleAskAi,
  };
}
