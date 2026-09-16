import { toast } from '@heroui/react';
import { type ChangeEvent, type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { generateThumbnail } from '@/utils/file/upload';
import { createUuid } from '@/utils/random/createUuid';

import { selectChatInputSelectedModel, useChatInputStoreApi } from './_store/ChatInputStore';
import { ChatInputFileContext, type ChatInputFileContextValue } from './ChatInputFileContextValue';
import type { LocalAttachmentPayload } from './index.type';

const MAX_IMAGE_RAW_BYTES = Math.floor(5 * 1024 * 1024 * 0.75);
const MAX_IMAGE_COUNT = 10;
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

export function ChatInputFileProvider({
  children,
  getUploadSessionId,
}: {
  children: ReactNode;
  getUploadSessionId: () => Promise<string>;
}) {
  const { t } = useTranslation('chat');
  const chatService = useChatService();
  const store = useChatInputStoreApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    addActiveAttachment,
    addPendingAttachmentUpload,
    removePendingAttachmentUpload,
    setAttachmentOpen,
    setPendingAttachmentUploadFailed,
  } = store.getState();

  async function uploadAndAddAttachment(
    file: File,
    options: { kind: 'file' | 'image'; thumbnailUrl?: string }
  ): Promise<LocalAttachmentPayload | null> {
    const id = createUuid();
    addPendingAttachmentUpload({
      id,
      filename: file.name,
      kind: options.kind,
      thumbnailUrl: options.thumbnailUrl,
      status: 'uploading',
    });
    try {
      const sessionId = await getUploadSessionId();
      const result = await chatService.uploadAttachment({
        sessionId,
        file,
        saveToLibrary: false,
      });
      const uploadStillSelected = store
        .getState()
        .pendingAttachmentUploads.some((upload) => upload.id === id);
      if (!uploadStillSelected) return null;

      removePendingAttachmentUpload(id);
      const attachment: LocalAttachmentPayload = {
        attachmentId: result.attachmentId,
        filename: result.filename ?? file.name,
        enabled: true,
        kind: options.kind,
        thumbnailUrl: options.thumbnailUrl,
      };
      addActiveAttachment(attachment);
      return attachment;
    } catch (err) {
      const uploadStillSelected = store
        .getState()
        .pendingAttachmentUploads.some((upload) => upload.id === id);
      if (!uploadStillSelected) return null;

      setPendingAttachmentUploadFailed(id);
      toast.danger(t('input.attachments.uploadFailed', { error: parseErrorMessage(err) }));
      return null;
    }
  }

  async function routeFiles(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList);
    let acceptedImageCount =
      store.getState().activeAttachments.filter((attachment) => attachment.kind === 'image')
        .length +
      store.getState().pendingAttachmentUploads.filter((upload) => upload.kind === 'image').length;
    for (const file of files) {
      const selectedModel = selectChatInputSelectedModel(store.getState());
      const currentModelVision = selectedModel?.vision ?? false;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isImage = IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/');

      if (!isImage) {
        void uploadAndAddAttachment(file, { kind: 'file' });
        continue;
      }
      if (!currentModelVision) {
        toast.warning(t('input.attachments.visionUnsupported'));
        void uploadAndAddAttachment(file, { kind: 'file' });
        continue;
      }
      if (acceptedImageCount >= MAX_IMAGE_COUNT) {
        toast.warning(t('input.attachments.imageCountLimit', { count: MAX_IMAGE_COUNT }));
        continue;
      }
      if (file.size > MAX_IMAGE_RAW_BYTES) {
        toast.warning(t('input.attachments.imageTooLarge', { name: file.name }));
        continue;
      }
      acceptedImageCount += 1;
      const thumbnailUrl = await generateThumbnail(file, 48).catch(() => '');
      void uploadAndAddAttachment(file, { kind: 'image', thumbnailUrl });
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      void routeFiles(e.target.files);
    }
    e.target.value = '';
  }

  function openLocalFilePicker(): void {
    fileInputRef.current?.click();
    setAttachmentOpen(false);
  }

  const value: ChatInputFileContextValue = {
    openLocalFilePicker,
    routeFiles,
  };

  return (
    <ChatInputFileContext.Provider value={value}>
      {children}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </ChatInputFileContext.Provider>
  );
}
