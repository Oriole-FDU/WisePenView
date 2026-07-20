import type { Doc } from 'yjs';

import type {
  AiDiffDisplayMode,
  NoteAiDiffPreviewData,
  NoteInlineCommentDraft,
  NoteInlineCommentSession,
  NoteSelectionSnapshot,
  WisepenProvider,
} from '@/domains/Note';
import type { NoteOutlineItem } from './engines/outline';

export type { NoteOutlineItem } from './engines/outline';

export type NoteEditorAnchor =
  { kind: 'block'; blockId: string } | { kind: 'inlineComment'; threadId: string };

export interface NoteFindResult {
  current: number;
  total: number;
}

export interface NoteBodyEditorHandle {
  focus: () => void;
  scrollToAnchor: (anchor: NoteEditorAnchor) => void;
  /** 通过系统打印对话框另存为 PDF（克隆 DOM + 打印前临时仅旧文本） */
  exportPdf: (options?: { title?: string; titleRoot?: HTMLElement | null }) => Promise<void>;
  /** 导出正文 Markdown artifact（AIDiff 按仅旧文本投影） */
  exportMarkdown: () => NoteMarkdownArtifact;
  /** 在文档中搜索文本（大小写不敏感），返回匹配总数 */
  findMatches: (query: string) => number;
  /** 跳转到下一个匹配 */
  findNext: () => NoteFindResult | null;
  /** 跳转到上一个匹配 */
  findPrev: () => NoteFindResult | null;
  /** 清除搜索状态并恢复原始光标位置 */
  clearFind: () => void;
}

interface NoteMarkdownArtifact {
  content: string;
  mimeType: 'text/markdown;charset=utf-8';
  extension: 'md';
}

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
  aiDiffDisplayMode: AiDiffDisplayMode;
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
}

export interface NoteInlineCommentsBinding {
  session: NoteInlineCommentSession;
  onCreateRequest: (draft: NoteInlineCommentDraft) => void;
  onThreadSelect?: (threadId: string) => void;
}

export interface CustomBlockNoteProps {
  resourceId: string;
  collaboration: NoteCollaborationBinding;
  state: NoteEditorState;
  aiDiffPreview?: NoteAiDiffPreviewData;
  portalContainers: NotePortalContainers;
  onOutlineChange?: (items: NoteOutlineItem[]) => void;
  onActiveHeadingChange?: (activeId: string | undefined) => void;
  onAiDiffPresenceChange?: (hasAiDiffContent: boolean) => void;
  onAskAi: (context: NoteSelectionSnapshot) => void;
  onAiDiffBodyContentHashChange?: (hash: string | undefined) => void;
  inlineComments?: NoteInlineCommentsBinding;
}
