import { useNoteService } from '@/domains';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useRef, type ChangeEvent, type RefObject } from 'react';
import { usePendingNoteImportStore } from './_store/usePendingNoteImportStore';

export const MARKDOWN_NOTE_FILE_ACCEPT = '.md,.markdown,text/markdown,text/x-markdown';

interface ImportedMarkdownNote {
  resourceId: string;
  title: string;
}

interface UseMarkdownNoteImportOptions {
  mountCreatedResource: (resourceId: string) => Promise<void>;
  onSuccess: (note: ImportedMarkdownNote) => void;
  onError?: () => void;
}

interface UseMarkdownNoteImportResult {
  fileInputRef: RefObject<HTMLInputElement | null>;
  importing: boolean;
  openFilePicker: () => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function isMarkdownFile(fileName: string): boolean {
  const normalizedName = fileName.trim().toLowerCase();
  return normalizedName.endsWith('.md') || normalizedName.endsWith('.markdown');
}

function resolveNoteTitle(fileName: string): string {
  const title = fileName.replace(/\.(?:md|markdown)$/i, '').trim();
  return title || '未命名笔记';
}

export function useMarkdownNoteImport({
  mountCreatedResource,
  onSuccess,
  onError,
}: UseMarkdownNoteImportOptions): UseMarkdownNoteImportResult {
  const noteService = useNoteService();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { loading: importing, run: importMarkdownNote } = useRequest(
    async (file: File) => {
      if (!isMarkdownFile(file.name)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_UNSUPPORTED_TYPE);
      }

      const title = resolveNoteTitle(file.name);
      const markdown = (await file.text()).replace(/^\uFEFF/, '');
      const { resourceId } = await noteService.createNote({ title });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }

      await mountCreatedResource(resourceId);
      usePendingNoteImportStore.getState().setPendingImport(resourceId, {
        markdown,
        sourceFileName: file.name,
      });

      return {
        resourceId,
        title,
      };
    },
    {
      manual: true,
      onSuccess,
      onError: (error) => {
        onError?.();
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const openFilePicker = useCallback(() => {
    if (importing) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [importing]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (file) {
        importMarkdownNote(file);
      }
    },
    [importMarkdownNote]
  );

  return {
    fileInputRef,
    importing,
    openFilePicker,
    handleFileChange,
  };
}
