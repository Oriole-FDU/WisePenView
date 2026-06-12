import type { Doc } from 'yjs';

/**
 * Yjs Y.Map 键名，与 BlockNote
 * [YjsThreadStore](https://www.blocknotejs.org/docs/features/collaboration/comments#yjsthreadstore) 示例一致。
 */
export const BLOCKNOTE_YJS_THREADS_MAP = 'threads' as const;
export const BLOCKNOTE_YJS_THREAD_REFERENCES_MAP = 'thread-references' as const;
export const BLOCKNOTE_YJS_COMMENT_USERS_MAP = 'comment-users' as const;
/** 公式批注的稳定锚点（blockId / inlineIndex），用于在公式编辑或重载后恢复 mark 与侧栏排序 */
export const BLOCKNOTE_YJS_FORMULA_THREAD_ANCHORS_MAP = 'thread-formula-anchors' as const;

export type FormulaThreadAnchor = {
  kind: 'block' | 'inline';
  /** math 块 id，或行内公式所在段落块 id */
  blockId: string;
  /** 仅 kind=inline：该段落内第几个 inlineMath（从 0 起） */
  inlineIndex?: number;
};

export function getBlockNoteThreadsYMap(doc: Doc) {
  return doc.getMap(BLOCKNOTE_YJS_THREADS_MAP);
}

export function getBlockNoteThreadReferencesYMap(doc: Doc) {
  return doc.getMap<string>(BLOCKNOTE_YJS_THREAD_REFERENCES_MAP);
}

export function getBlockNoteCommentUsersYMap(doc: Doc) {
  return doc.getMap<{ username: string; avatarUrl: string }>(BLOCKNOTE_YJS_COMMENT_USERS_MAP);
}

export function getBlockNoteFormulaThreadAnchorsYMap(doc: Doc) {
  return doc.getMap<FormulaThreadAnchor>(BLOCKNOTE_YJS_FORMULA_THREAD_ANCHORS_MAP);
}
