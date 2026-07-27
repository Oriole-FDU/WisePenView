import { useChatService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { base64ToFile, fileToBase64, generateThumbnail } from '@/utils/file/upload';
import { createUuid } from '@/utils/random/createUuid';
import { toast } from '@heroui/react';
import { useMount, useUnmount } from 'ahooks';
import { useRef, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatInputFileContext, type ChatInputFileContextValue } from './ChatInputFileContextValue';
import { selectChatInputSelectedModel, useChatInputStoreApi } from './_store/ChatInputStore';
import type { LocalAttachmentPayload } from './index.type';

const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_RAW_BYTES_APPROX = Math.floor(MAX_IMAGE_BASE64_BYTES * 0.75);
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
  const base64MapRef = useRef<Map<string, string>>(new Map());
  const pendingAttachmentFileMapRef = useRef<Map<string, File>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const {
    addActiveAttachment,
    addPendingAttachmentUpload,
    addPendingImageMeta,
    removePendingAttachmentUpload,
    removePendingImageMeta,
    setAttachmentOpen,
    setPendingAttachmentUploadFailed,
    setPendingAttachmentUploadStatus,
  } = store.getState();

  useMount(() => {
    unsubscribeRef.current = store.subscribe((state, previousState) => {
      if (state.pendingImageMetas !== previousState.pendingImageMetas) {
        const validImageIds = new Set(state.pendingImageMetas.map((meta) => meta.id));
        for (const key of base64MapRef.current.keys()) {
          if (!validImageIds.has(key)) {
            base64MapRef.current.delete(key);
          }
        }
      }

      if (state.pendingAttachmentUploads !== previousState.pendingAttachmentUploads) {
        const validAttachmentIds = new Set(
          state.pendingAttachmentUploads.map((upload) => upload.id)
        );
        for (const key of pendingAttachmentFileMapRef.current.keys()) {
          if (!validAttachmentIds.has(key)) {
            pendingAttachmentFileMapRef.current.delete(key);
          }
        }
      }
    });
  });

  useUnmount(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  });

  function removePendingImage(id: string): void {
    removePendingImageMeta(id);
    base64MapRef.current.delete(id);
  }

  function queueLocalAttachment(file: File): void {
    const id = createUuid();
    pendingAttachmentFileMapRef.current.set(id, file);
    addPendingAttachmentUpload({ id, filename: file.name, status: 'pending' });
  }

  async function uploadAndAddAttachment(
    file: File,
    uploadId?: string
  ): Promise<LocalAttachmentPayload | null> {
    const id = uploadId ?? createUuid();
    if (uploadId) {
      setPendingAttachmentUploadStatus(id, 'uploading');
    } else {
      addPendingAttachmentUpload({ id, filename: file.name, status: 'uploading' });
    }
    try {
      const sessionId = await getUploadSessionId();
      const result = await chatService.uploadAttachment({
        sessionId,
        file,
        saveToLibrary: false,
      });
      removePendingAttachmentUpload(id);
      const attachment: LocalAttachmentPayload = {
        attachmentId: result.attachmentId,
        filename: result.filename ?? file.name,
        enabled: true,
      };
      addActiveAttachment(attachment);
      pendingAttachmentFileMapRef.current.delete(id);
      return attachment;
    } catch (err) {
      setPendingAttachmentUploadFailed(id);
      toast.danger(t('input.attachments.uploadFailed', { error: parseErrorMessage(err) }));
      return null;
    }
  }

  async function addPendingVisionImage(file: File): Promise<void> {
    try {
      if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
        toast.warning(t('input.attachments.imageTooLarge', { name: file.name }));
        return;
      }
      const { mimeType, base64 } = await fileToBase64(file);
      const id = createUuid();
      const thumbnailUrl = await generateThumbnail(file, 48).catch(() => '');
      base64MapRef.current.set(id, base64);
      addPendingImageMeta({ id, filename: file.name, mimeType, thumbnailUrl });
    } catch (err) {
      toast.danger(t('input.attachments.imageAddFailed', { error: parseErrorMessage(err) }));
    }
  }

  async function uploadPendingLocalAttachments(): Promise<LocalAttachmentPayload[] | null> {
    const uploads = store
      .getState()
      .pendingAttachmentUploads.filter((upload) =>
        pendingAttachmentFileMapRef.current.has(upload.id)
      );
    if (uploads.length === 0) return [];

    const attachments: LocalAttachmentPayload[] = [];
    for (const upload of uploads) {
      const file = pendingAttachmentFileMapRef.current.get(upload.id);
      if (!file) continue;
      const attachment = await uploadAndAddAttachment(file, upload.id);
      if (!attachment) return null;
      attachments.push(attachment);
    }

    return attachments;
  }

  async function uploadPendingImages(): Promise<LocalAttachmentPayload[] | null> {
    const metas = store.getState().pendingImageMetas;
    if (metas.length === 0) return [];

    const attachments: LocalAttachmentPayload[] = [];
    for (const meta of metas) {
      const base64 = base64MapRef.current.get(meta.id);
      if (!base64) {
        toast.danger(t('input.attachments.imageDataExpired', { name: meta.filename }));
        return null;
      }
      const file = base64ToFile(base64, meta.mimeType, meta.filename);
      const attachment = await uploadAndAddAttachment(file);
      if (!attachment) return null;
      attachments.push(attachment);
      removePendingImage(meta.id);
    }

    return attachments;
  }

  async function preparePendingAttachments(): Promise<LocalAttachmentPayload[] | null> {
    const localAttachments = await uploadPendingLocalAttachments();
    if (!localAttachments) return null;

    const imageAttachments = await uploadPendingImages();
    if (!imageAttachments) return null;

    return [...localAttachments, ...imageAttachments];
  }

  async function routeFiles(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList);
    let acceptedImageCount = store.getState().pendingImageMetas.length;
    for (const file of files) {
      const selectedModel = selectChatInputSelectedModel(store.getState());
      const currentModelVision = selectedModel?.vision ?? false;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isImage = IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/');

      if (!isImage) {
        queueLocalAttachment(file);
        continue;
      }
      if (!currentModelVision) {
        toast.warning(t('input.attachments.visionUnsupported'));
        queueLocalAttachment(file);
        continue;
      }
      if (acceptedImageCount >= MAX_IMAGE_COUNT) {
        toast.warning(t('input.attachments.imageCountLimit', { count: MAX_IMAGE_COUNT }));
        continue;
      }
      if (file.size > MAX_IMAGE_RAW_BYTES_APPROX) {
        toast.warning(t('input.attachments.imageTooLarge', { name: file.name }));
        continue;
      }
      acceptedImageCount += 1;
      await addPendingVisionImage(file);
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

  function clearPendingFileCache(): void {
    base64MapRef.current.clear();
    pendingAttachmentFileMapRef.current.clear();
  }

  const value: ChatInputFileContextValue = {
    openLocalFilePicker,
    routeFiles,
    preparePendingAttachments,
    clearPendingFileCache,
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
