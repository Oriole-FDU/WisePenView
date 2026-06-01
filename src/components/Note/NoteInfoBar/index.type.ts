import type { NoteInfoDisplayData } from '@/domains/Note';

export interface NoteInfoBarProps {
  noteInfoDisplay?: NoteInfoDisplayData;
  /** 父组件维护的展示点赞数（含乐观更新） */
  displayLikeCount?: number | null;
}
