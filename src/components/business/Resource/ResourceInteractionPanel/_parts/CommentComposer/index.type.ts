export interface CommentComposerProps {
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  onSubmit(content: string, imageUrls: string[]): Promise<void>;
}
