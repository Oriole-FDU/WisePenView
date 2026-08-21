import { AppButton } from '@/components/Button';
import AppIconButton from '@/components/Button/AppIconButton';
import { EmojiPicker, TextArea } from '@/components/Input';

import { useUnmount } from 'ahooks';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import styles from './style.module.less';

export interface CommentInputImage {
  id: string;
  file: File;
}

interface CommentInputLabels {
  insertEmoji: string;
  addImage: string;
  removeImage(name: string): string;
  submit: string;
  cancel?: string;
}

interface CommentInputProps {
  value: string;
  placeholder: string;
  labels: CommentInputLabels;
  pendingImages: CommentInputImage[];
  canSubmit: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  imageUploadEnabled?: boolean;
  showActions?: boolean;
  onChange(value: string): void;
  onAddImages(files: File[]): void;
  onRemoveImage(imageId: string): void;
  onCancel?: () => void;
  onSubmit(): void;
}

function PendingImagePreview({
  image,
  removeLabel,
  onRemove,
}: {
  image: CommentInputImage;
  removeLabel: string;
  onRemove(): void;
}) {
  const [previewUrl] = useState(() => URL.createObjectURL(image.file));
  useUnmount(() => URL.revokeObjectURL(previewUrl));

  return (
    <span className={styles.pendingImage}>
      <img src={previewUrl} alt={image.file.name} />
      <AppIconButton
        icon={<X size={12} aria-hidden />}
        label={removeLabel}
        size="sm"
        className={styles.removeImageButton}
        onPress={onRemove}
      />
    </span>
  );
}

function CommentInput({
  value,
  placeholder,
  labels,
  pendingImages,
  canSubmit,
  disabled,
  autoFocus,
  imageUploadEnabled = true,
  showActions = true,
  onChange,
  onAddImages,
  onRemoveImage,
  onCancel,
  onSubmit,
}: CommentInputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const appendImages = (files: File[]) => {
    if (!imageUploadEnabled) return;
    onAddImages(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    appendImages(files);
  };

  const handleSubmit = () => {
    if (disabled || !canSubmit) return;
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.nativeEvent.isComposing ||
      (!event.metaKey && !event.ctrlKey)
    ) {
      return;
    }
    event.preventDefault();
    handleSubmit();
  };

  const handleEmojiSelect = (emoji: string) => {
    const textArea = textAreaRef.current;
    const selectionStart = textArea?.selectionStart ?? value.length;
    const selectionEnd = textArea?.selectionEnd ?? selectionStart;
    const caretPosition = selectionStart + emoji.length;
    onChange(`${value.slice(0, selectionStart)}${emoji}${value.slice(selectionEnd)}`);

    window.requestAnimationFrame(() => {
      const currentTextArea = textAreaRef.current;
      if (!currentTextArea || currentTextArea !== textArea) return;
      currentTextArea.focus();
      currentTextArea.setSelectionRange(caretPosition, caretPosition);
    });
  };

  return (
    <div className={styles.composer}>
      {pendingImages.length > 0 ? (
        <div className={styles.pendingImages}>
          {pendingImages.map((image) => (
            <PendingImagePreview
              key={image.id}
              image={image}
              removeLabel={labels.removeImage(image.file.name)}
              onRemove={() => onRemoveImage(image.id)}
            />
          ))}
        </div>
      ) : null}

      <div className={styles.inputWrap}>
        <TextArea
          ref={textAreaRef}
          value={value}
          rows={1}
          autoFocus={autoFocus}
          disabled={disabled}
          className={styles.textarea}
          aria-label={placeholder}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.inlineActions}>
          <EmojiPicker
            label={labels.insertEmoji}
            disabled={disabled}
            onSelect={handleEmojiSelect}
          />
          {imageUploadEnabled ? (
            <AppIconButton
              icon={<ImagePlus size={15} aria-hidden />}
              label={labels.addImage}
              size="sm"
              isDisabled={disabled}
              onPress={() => imageInputRef.current?.click()}
            />
          ) : null}
        </div>
      </div>

      {imageUploadEnabled ? (
        <input
          ref={imageInputRef}
          className={styles.imageInput}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={(event) => {
            appendImages(Array.from(event.target.files ?? []));
            event.currentTarget.value = '';
          }}
        />
      ) : null}

      {showActions ? (
        <div className={styles.actions}>
          {onCancel && labels.cancel ? (
            <AppButton variant="ghost" size="sm" isDisabled={disabled} onPress={onCancel}>
              {labels.cancel}
            </AppButton>
          ) : null}
          <AppButton
            variant="primary"
            size="sm"
            isDisabled={disabled || !canSubmit}
            aria-busy={disabled || undefined}
            onPress={handleSubmit}
          >
            {labels.submit}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}

export default CommentInput;
