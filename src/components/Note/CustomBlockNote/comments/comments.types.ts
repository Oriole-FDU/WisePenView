/** 与 DefaultThreadStoreAuth 一致：comment=仅能批注/解决等，editor=还可删除整串批注 */
export type BlockNoteCommentDocumentRole = 'comment' | 'editor';

export type CommentUserDisplayRecord = Record<string, { name: string; avatar?: string }>;
