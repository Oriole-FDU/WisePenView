import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import type { TFunction } from 'i18next';
import { type RefObject, useState } from 'react';

import type { NoteBodyEditorHandle } from '@/components/business/Note/CustomBlockNote/index.type';
import type { NoteSelectionSnapshot, NoteSessionStatus } from '@/domains/Note';
import { useResourceHostChatContextActions } from '@/layouts/Resource/_context';
import { parseErrorMessage } from '@/utils/error';

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
  const { openChatPanel, setChatContext } = useResourceHostChatContextActions();
  const [exportPending, setExportPending] = useState(false);
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
    clientContentSignature: noteClientContentSignature,
  });

  const handleAskAi = useMemoizedFn((selection: NoteSelectionSnapshot) => {
    setChatContext(createNoteSelectionChatContext(resourceId, selection));
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
