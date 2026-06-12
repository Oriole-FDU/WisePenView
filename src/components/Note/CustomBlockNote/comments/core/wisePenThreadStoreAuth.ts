import type { CommentData, CommentReactionData, ThreadData } from '@blocknote/core/comments';
import { ThreadStoreAuth } from '@blocknote/core/comments';

import type { BlockNoteCommentDocumentRole } from '../comments.types';

function getThreadComments(thread: ThreadData): ThreadData['comments'] {
  return Array.isArray(thread.comments) ? thread.comments : [];
}

function isThreadAuthor(thread: ThreadData, userId: string): boolean {
  return getThreadComments(thread)[0]?.userId === userId;
}

function getCommentReactions(comment: CommentData): CommentData['reactions'] {
  return Array.isArray(comment.reactions) ? comment.reactions : [];
}

function hasReactionUser(reaction: CommentReactionData, userId: string): boolean {
  return Array.isArray(reaction.userIds) && reaction.userIds.includes(userId);
}

/**
 * WisePen 批注权限：
 * - 有批注权限的协作者可以创建批注、回复、添加/取消自己的反应
 * - 只能编辑/删除自己的单条批注
 * - 只有笔记拥有者或 thread 创建者可以解决/重新打开/删除整串批注
 */
export class WisePenThreadStoreAuth extends ThreadStoreAuth {
  public userId: string;
  private readonly role: BlockNoteCommentDocumentRole;
  private readonly isNoteOwner: boolean;

  constructor(userId: string, role: BlockNoteCommentDocumentRole, isNoteOwner: boolean) {
    super();
    this.userId = userId;
    this.role = role;
    this.isNoteOwner = isNoteOwner;
  }

  canCreateThread(): boolean {
    return true;
  }

  canAddComment(_thread: ThreadData): boolean {
    return true;
  }

  canUpdateComment(comment: CommentData): boolean {
    return comment.userId === this.userId;
  }

  canDeleteThread(thread: ThreadData): boolean {
    return this.isNoteOwner || (this.role === 'editor' && isThreadAuthor(thread, this.userId));
  }

  canDeleteComment(comment: CommentData): boolean {
    return this.isNoteOwner || comment.userId === this.userId;
  }

  canResolveThread(thread: ThreadData): boolean {
    return this.isNoteOwner || isThreadAuthor(thread, this.userId);
  }

  canUnresolveThread(thread: ThreadData): boolean {
    return this.isNoteOwner || isThreadAuthor(thread, this.userId);
  }

  canAddReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }
    return !getCommentReactions(comment).some(
      (reaction) => reaction.emoji === emoji && hasReactionUser(reaction, this.userId)
    );
  }

  canDeleteReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }
    return getCommentReactions(comment).some(
      (reaction) => reaction.emoji === emoji && hasReactionUser(reaction, this.userId)
    );
  }
}
