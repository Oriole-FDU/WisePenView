import type { ResourceComment } from '@/domains/Interact';

const IMAGE_ONLY_CONTENT = '\u200B';

export function getAuthorInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function hasVisibleCommentContent(content: string): boolean {
  return content.trim().length > 0 && content !== IMAGE_ONLY_CONTENT;
}

export function updateCommentLikeCount(
  comments: ResourceComment[],
  commentId: string,
  liked: boolean
): ResourceComment[] {
  return comments.map((comment) =>
    comment.commentId === commentId
      ? { ...comment, likeCount: Math.max(0, comment.likeCount + (liked ? 1 : -1)) }
      : comment
  );
}
