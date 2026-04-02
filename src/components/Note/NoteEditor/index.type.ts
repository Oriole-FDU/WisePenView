import type * as Y from 'yjs';

import type { NoteYjsSocket } from '@/connection/plugins/note';

/** 供笔记页正文与标题之间的焦点链使用 */
export interface NoteEditorHandle {
  focus: () => void;
  retrySession: () => void;
}

export interface NoteEditorProps {
  resourceId: string;
  doc: Y.Doc;
  /** Yjs WebSocket 通道；BlockNote 侧在 {@link CustomBlockNote} 内再断言为 collaboration provider */
  provider: NoteYjsSocket;
}
