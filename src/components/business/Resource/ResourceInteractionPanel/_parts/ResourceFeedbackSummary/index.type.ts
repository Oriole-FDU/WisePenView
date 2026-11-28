import type { ReactNode } from 'react';

/** 资源阅读、收藏与点赞摘要。 */
export interface ResourceFeedbackSummaryProps {
  readCount?: number | null;
  favoriteCount?: number | null;
  liked: boolean;
  likeCount: number;
  likePending: boolean;
  onLikeChange(liked: boolean): void;
  favoriteAction: ReactNode;
}
