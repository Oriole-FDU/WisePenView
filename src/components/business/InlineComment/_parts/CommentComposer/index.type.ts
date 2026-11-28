import type { InlineCommentProps, InlineCommentSubmitPayload } from '../../index.type';

export interface CommentComposerProps {
  placeholder: string;
  imageUpload: InlineCommentProps['imageUpload'];
  onCancel?: () => void;
  onSubmit(payload: InlineCommentSubmitPayload): Promise<void>;
}
