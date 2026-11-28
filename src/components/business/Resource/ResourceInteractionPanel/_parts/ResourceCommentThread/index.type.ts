import type { RefObject } from 'react';

import type { ResourceComment } from '@/domains/ResourceComment';

export interface ResourceCommentThreadProps {
  dataIndex: number;
  measureElement: (element: Element | null) => void;
  scrollElementRef: RefObject<HTMLDivElement | null>;
  resourceId: string;
  rootComment: ResourceComment;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  likedCommentIds: ReadonlySet<string>;
  pendingLikeIds: ReadonlySet<string>;
  onLike(comment: ResourceComment): Promise<boolean>;
  onDelete(comment: ResourceComment, onDeleted?: () => void | Promise<void>): void;
  onCommentsChanged(): Promise<void>;
  onPreviewImage(url: string): void;
}
