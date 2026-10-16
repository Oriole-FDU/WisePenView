/** 只检查实际内容，不把段落 ID、格式及空白字符当作笔记内容。 */
export function hasNoteContent(value: unknown): boolean {
  if (typeof value === 'string') return /[^ \r\n]/.test(value);
  if (Array.isArray(value)) return value.some(hasNoteContent);
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (['image', 'file', 'audio', 'video'].includes(String(item.type))) return true;
  if (item.type === 'inlineMath' || item.type === 'math' || item.type === 'mermaid') return true;
  return ['text', 'content', 'children', 'rows', 'cells'].some((key) => hasNoteContent(item[key]));
}

export interface MyNote {
  resourceId: string;
  name: string;
  defaultName: string;
  createdAt: number;
  hasBody: boolean;
  hasTitle: boolean;
  eligible: boolean;
}

export function findReusableNote(notes: readonly MyNote[]): MyNote | undefined {
  return notes
    .filter(
      (note) => note.eligible && !note.hasBody && !note.hasTitle && note.name === note.defaultName
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}
