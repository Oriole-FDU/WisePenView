import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CommentInput, { type CommentInputImage } from '@/components/business/CommentInput';
import { useImageService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { createUuid } from '@/utils/random/createUuid';

import styles from './style.module.less';

const IMAGE_ONLY_CONTENT = '\u200B';

interface CommentComposerProps {
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  onSubmit(content: string, imageUrls: string[]): Promise<void>;
}

function CommentComposer({ placeholder, autoFocus, onCancel, onSubmit }: CommentComposerProps) {
  const { t } = useTranslation(['resource', 'common']);
  const imageService = useImageService();
  const [content, setContent] = useState('');
  const [pendingImages, setPendingImages] = useState<CommentInputImage[]>([]);
  const [submitError, setSubmitError] = useState<string>();
  const canSubmit = Boolean(content.trim()) || pendingImages.length > 0;

  const appendImages = (files: File[]) => {
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
      const uploadResults = await Promise.allSettled(
        pendingImages.map(async ({ file }) => {
          const result = await imageService.uploadImage({
            file,
            scene: 'PUBLIC_IMAGE_FOR_USER',
            bizTag: 'resource-comment',
          });
          return result.publicUrl;
        })
      );
      const imageUrls = uploadResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : []
      );
      const failedImages = pendingImages.filter(
        (_, index) => uploadResults[index].status === 'rejected'
      );
      const failedUpload = uploadResults.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );

      if (failedImages.length === pendingImages.length && failedUpload) {
        throw failedUpload.reason;
      }

      await onSubmit(content.trim() || IMAGE_ONLY_CONTENT, imageUrls);
      setContent('');
      setPendingImages(failedImages);
      setSubmitError(failedUpload ? parseErrorMessage(failedUpload.reason) : undefined);
    },
    {
      manual: true,
      showErrorToast: false,
      onErrorEffect: (error) => setSubmitError(parseErrorMessage(error)),
    }
  );

  return (
    <div className={styles.composer}>
      <CommentInput
        value={content}
        placeholder={placeholder}
        pendingImages={pendingImages}
        canSubmit={canSubmit}
        disabled={submitting}
        autoFocus={autoFocus}
        labels={{
          insertEmoji: t('resource:comment.insertEmoji'),
          addImage: t('resource:comment.addImage'),
          removeImage: (name) => t('resource:comment.removeImage', { name }),
          cancel: t('common:actions.cancel'),
          submit: t('resource:comment.publish'),
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
