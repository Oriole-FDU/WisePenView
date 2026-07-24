import AppIconButton from '@/components/Button/AppIconButton';
import { useImageService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { createUuid } from '@/utils/random/createUuid';
import { TextArea } from '@heroui/react';
import { useRequest, useUnmount } from 'ahooks';
import { ImagePlus, Send, X } from 'lucide-react';
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import EmojiPicker from './EmojiPicker';
import type { InlineCommentProps, InlineCommentSubmitPayload } from './index.type';
import styles from './style.module.less';

const IMAGE_ONLY_CONTENT = '\u200B';

interface PendingImage {
  id: string;
  file: File;
}

interface CommentComposerProps {
  placeholder: string;
  imageUpload: InlineCommentProps['imageUpload'];
  onSubmit(payload: InlineCommentSubmitPayload): Promise<void>;
}

function PendingImagePreview({ image, onRemove }: { image: PendingImage; onRemove(): void }) {
  const [previewUrl] = useState(() => URL.createObjectURL(image.file));
  useUnmount(() => URL.revokeObjectURL(previewUrl));

  return (
    <span className={styles.pendingImage}>
      <img src={previewUrl} alt={image.file.name} />
      <AppIconButton
        icon={<X size={12} aria-hidden />}
        label={`移除图片 ${image.file.name}`}
        size="sm"
        className={styles.removeImageButton}
        onPress={onRemove}
      />
    </span>
  );
}

function CommentComposer({ placeholder, imageUpload, onSubmit }: CommentComposerProps) {
  const imageService = useImageService();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(createUuid);
  const [submitError, setSubmitError] = useState<string>();
  const canSubmit = Boolean(content.trim()) || pendingImages.length > 0;

  const appendImages = (files: File[]) => {
    if (imageUpload === false) return;
    const images = files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ id: createUuid(), file }));
    if (images.length === 0) return;
    setPendingImages((currentImages) => [...currentImages, ...images]);
    setSubmitError(undefined);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    appendImages(files);
  };

  const { loading: submitting, runAsync: submitComment } = useRequest(
    async () => {
      if (!canSubmit) return;
      const imageUrls =
        imageUpload === false
          ? []
          : await Promise.all(
              pendingImages.map(async ({ file }) => {
                const result = await imageService.uploadImage({
                  file,
                  scene: imageUpload?.scene ?? 'PUBLIC_IMAGE_FOR_USER',
                  bizTag: imageUpload?.bizTag ?? 'inline-comment',
                });
                return result.publicUrl;
              })
            );
      await onSubmit({
        content: content.trim() || IMAGE_ONLY_CONTENT,
        imageUrls,
        idempotencyKey,
      });
      setContent('');
      setPendingImages([]);
      setIdempotencyKey(createUuid());
      setSubmitError(undefined);
    },
    {
      manual: true,
      onError: (error) => setSubmitError(parseErrorMessage(error)),
    }
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submitComment();
  };

  return (
    <div className={styles.composer}>
      <TextArea
        value={content}
        rows={2}
        autoFocus
        disabled={submitting}
        className={styles.composerTextarea}
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={(event) => setContent(event.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
      />

      {pendingImages.length > 0 ? (
        <div className={styles.pendingImages}>
          {pendingImages.map((image) => (
            <PendingImagePreview
              key={image.id}
              image={image}
              onRemove={() =>
                setPendingImages((currentImages) =>
                  currentImages.filter((currentImage) => currentImage.id !== image.id)
                )
              }
            />
          ))}
        </div>
      ) : null}

      <div className={styles.composerToolbar}>
        <EmojiPicker
          label="插入表情"
          disabled={submitting}
          onSelect={(emojiId) => setContent((currentContent) => `${currentContent}${emojiId}`)}
        />
        {imageUpload !== false ? (
          <>
            <AppIconButton
              icon={<ImagePlus size={15} aria-hidden />}
              label="添加图片"
              size="sm"
              isDisabled={submitting}
              className={styles.iconButton}
              onPress={() => imageInputRef.current?.click()}
            />
            <input
              ref={imageInputRef}
              className={styles.imageInput}
              type="file"
              accept="image/*"
              multiple
              disabled={submitting}
              onChange={(event) => {
                appendImages(Array.from(event.target.files ?? []));
                event.currentTarget.value = '';
              }}
            />
          </>
        ) : null}
        <AppIconButton
          icon={<Send size={14} aria-hidden />}
          label="发送批注"
          size="sm"
          variant="primary"
          isDisabled={!canSubmit || submitting}
          className={styles.sendButton}
          tooltip={{ content: '发送' }}
          aria-busy={submitting || undefined}
          onPress={() => void submitComment()}
        />
      </div>

      {submitError ? <p className={styles.errorText}>{submitError}</p> : null}
    </div>
  );
}

export default CommentComposer;
