import type { Doc } from 'yjs';

import type { NoteAiDiffPreviewData, WisepenProvider } from '@/domains/Note';

import type { CustomBlockNoteProps } from '../index.type';

export interface NoteCollaborationUser {
  name: string;
  color: string;
}

interface NoteCollaborationBinding {
  doc: Doc;
  provider: WisepenProvider;
  user: NoteCollaborationUser;
  /** 协同 provider 已完成首次服务端同步，此后才允许写入待导入正文 */
  ready: boolean;
}

interface NoteEditorState {
  /** UI/editable：连接中或无 EDIT 时为 true */
  readOnly: boolean;
  /**
   * PM 层拦截本地改 doc：仅「已连接且无协同编辑权」时为 true。
   * 连接中须为 false，否则 filter 会拦 BlockNote 初始化（Block doesn't have id）。
   */
  blockLocalDocWrites: boolean;
}

interface NotePortalContainers {
  aiBulkActions: HTMLElement | null;
  findBar: HTMLElement | null;
  aiDiffControls: HTMLElement | null;
}

export interface NoteEditorRuntimeProps extends CustomBlockNoteProps {
  resourceId: string;
  collaboration: NoteCollaborationBinding;
  state: NoteEditorState;
  aiDiffPreview?: NoteAiDiffPreviewData;
  portalContainers: NotePortalContainers;
}
