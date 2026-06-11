import type { CommentData, ThreadData } from '@blocknote/core/comments';
import { ThreadStoreAuth } from '@blocknote/core/comments';

/**
 * 仅展示已有批注、禁止任何修改（不创建/回复/解决/重新打开/反应等）。
 * 与 DefaultThreadStoreAuth 的「角色」正交，用于「批注可写/不可写」一维。
 */
export class ReadOnlyThreadStoreAuth extends ThreadStoreAuth {
  canCreateThread() {
    return false;
  }

  canAddComment(_thread: ThreadData) {
    return false;
  }

  canUpdateComment(_comment: CommentData) {
    return false;
  }

  canDeleteComment(_comment: CommentData) {
    return false;
  }

  canDeleteThread(_thread: ThreadData) {
    return false;
  }

  canResolveThread(_thread: ThreadData) {
    return false;
  }

  canUnresolveThread(_thread: ThreadData) {
    return false;
  }

  canAddReaction(_comment: CommentData, _emoji?: string) {
    return false;
  }

  canDeleteReaction(_comment: CommentData, _emoji?: string) {
    return false;
  }
}
