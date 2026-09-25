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

export interface CommentInputProps {
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
