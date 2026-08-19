import type { ImageUploadRequest } from '@/domains/Image';
import type { InlineCommentItem } from '@/domains/InlineComment';

export interface InlineCommentThreadView {
  threadId: string;
  quoteText: string;
  items: readonly InlineCommentItem[];
}

export interface InlineCommentDraftView {
  key: string;
  quoteText: string;
}

export interface InlineCommentSubmitPayload {
  content: string;
  imageUrls: string[];
  idempotencyKey: string;
}

export interface InlineCommentReactionPayload {
  threadId: string;
  itemId: string;
  emoji: string;
  selected: boolean;
}

export interface InlineCommentDeletePayload {
  threadId: string;
  itemId: string;
}

export interface InlineCommentProps {
  threads: readonly InlineCommentThreadView[];
  resolvedThreads: readonly InlineCommentThreadView[];
  loading?: boolean;
  error?: unknown;
  draft?: InlineCommentDraftView;
  activeThreadId?: string;
  isHistoryOpen: boolean;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  imageUpload?: Pick<ImageUploadRequest, 'scene' | 'bizTag'> | false;
  onHistoryOpenChange(open: boolean): void;
  onDraftClose(): void;
  onThreadSelect(threadId: string): void;
  onCreate(payload: InlineCommentSubmitPayload): Promise<void>;
  onReply(threadId: string, payload: InlineCommentSubmitPayload): Promise<void>;
  onReactionChange(payload: InlineCommentReactionPayload): Promise<void>;
  onResolve(threadId: string): Promise<void>;
  onReopen(threadId: string): Promise<void>;
  onDelete(payload: InlineCommentDeletePayload): Promise<void>;
}
