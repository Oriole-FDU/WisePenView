import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CommentInput, { type CommentInputImage } from '@/components/business/CommentInput';
import { useImageService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { createUuid } from '@/utils/random/createUuid';

import type { InlineCommentProps, InlineCommentSubmitPayload } from './index.type';
import styles from './style.module.less';

const IMAGE_ONLY_CONTENT = '\u200B';

interface CommentComposerProps {
  placeholder: string;
  imageUpload: InlineCommentProps['imageUpload'];
  onCancel?: () => void;
  onSubmit(payload: InlineCommentSubmitPayload): Promise<void>;
}

function CommentComposer({ placeholder, imageUpload, onCancel, onSubmit }: CommentComposerProps) {
  const { t } = useTranslation('common');
  const imageService = useImageService();
  const [content, setContent] = useState('');
  const [pendingImages, setPendingImages] = useState<CommentInputImage[]>([]);
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

  const { loading: submitting, runAsync: submitComment } = useApi(
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
      showErrorToast: false,
      onErrorEffect: (error) => setSubmitError(parseErrorMessage(error)),
    }
  );

  const showActions = Boolean(content.trim()) || pendingImages.length > 0;

  return (
    <div className={styles.composer}>
      <CommentInput
        value={content}
        placeholder={placeholder}
        pendingImages={pendingImages}
        canSubmit={canSubmit}
        disabled={submitting}
        imageUploadEnabled={imageUpload !== false}
        showActions={showActions}
        labels={{
          insertEmoji: t('inlineComment.insertEmoji'),
          addImage: t('inlineComment.addImage'),
          removeImage: (name) => t('inlineComment.removeImage', { name }),
          cancel: t('actions.cancel'),
          submit: t('inlineComment.send'),
        }}
        onChange={setContent}
        onAddImages={appendImages}
        onRemoveImage={(imageId) =>
          setPendingImages((currentImages) =>
            currentImages.filter((currentImage) => currentImage.id !== imageId)
          )
        }
        onCancel={onCancel}
        onSubmit={() => void submitComment()}
      />

      {submitError ? <p className={styles.errorText}>{submitError}</p> : null}
    </div>
  );
}

export default CommentComposer;
