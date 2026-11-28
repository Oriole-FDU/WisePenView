import type { ResourceComment } from '@/domains/ResourceComment';

/** 资源互动面板中的单条评论。 */
export interface ResourceCommentItemProps {
  comment: ResourceComment;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  liked: boolean;
  likePending: boolean;
  onReply(comment: ResourceComment): void;
  onLike(comment: ResourceComment): Promise<boolean>;
  onDelete(comment: ResourceComment): void;
  onPreviewImage(url: string): void;
}
