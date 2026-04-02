/** 笔记正文在 Y.Doc 中的 XmlFragment 名；需与后端 observeDeep 及 BlockNote 绑定名一致 */
export const NOTE_YJS_DOCUMENT_FRAGMENT = 'document-store' as const;

/** y-indexeddb 存储键：单条笔记一个 room，与 resourceId 对应（不承诺离线冷启动可打开） */
export function noteYjsIdbRoomName(resourceId: string): string {
  return `wisepen-note:${resourceId}`;
}
