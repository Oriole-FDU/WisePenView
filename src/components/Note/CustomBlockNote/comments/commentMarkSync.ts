/** 批注 mark 写入事务 meta：只读正文模式下仍允许落盘 CommentMark */
export const WISEPEN_COMMENT_MARK_SYNC_META = 'wisePenCommentMarkSync';

export function isWisePenCommentMarkSyncTransaction(tr: {
  getMeta: (key: string) => unknown;
}): boolean {
  return tr.getMeta(WISEPEN_COMMENT_MARK_SYNC_META) === true;
}
