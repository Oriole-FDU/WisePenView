export interface InlineCommentUserDisplay {
  name: string;
  avatar?: string;
}

export interface InlineCommentAuthor extends InlineCommentUserDisplay {
  id: string;
}

export interface InlineCommentAnchor {
  externalAnchorId: string;
  quoteText: string;
  anchorPayload: Record<string, unknown>;
}

export interface InlineCommentReaction {
  userId: string;
  emoji: string;
  createdAt?: number;
}

export interface InlineCommentReactionGroup {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  users: InlineCommentUserDisplay[];
}

export interface InlineCommentItem {
  itemId: string;
  authorId: string;
  author: InlineCommentAuthor;
  content: string;
  imageUrls: string[];
  mentionUserIds: string[];
  reactions: InlineCommentReaction[];
  reactionGroups: InlineCommentReactionGroup[];
  createdAt: number;
  updatedAt: number;
}

export interface InlineCommentThread {
  inlineCommentId: string;
  resourceId: string;
  applicableFromVersion?: number;
  applicableToVersion?: number;
  creatorId: string;
  creator: InlineCommentAuthor;
  anchor: InlineCommentAnchor;
  items: InlineCommentItem[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedByUser?: InlineCommentAuthor;
  resolvedAt?: number;
  createdAt: number;
  updatedAt: number;
}
