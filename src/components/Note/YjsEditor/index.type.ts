/** 供笔记页正文与标题之间的焦点链使用 */
export interface NoteYjsEditorHandle {
  focus: () => void;
}

export interface NoteYjsEditorProps {
  resourceId: string;
  userId: string;
  /** Yjs / WebSocket 会话可用（如已 connected）时调用，至多一次 */
  onSessionReady?: () => void;
  /** 长时间未连上或连接失败时由子层上报 */
  onSessionError?: (message: string) => void;
  /** WebSocket 连接状态变化时回调，true 表示已连接，false 表示断开 */
  onSessionStatusChange?: (isConnected: boolean) => void;
}
