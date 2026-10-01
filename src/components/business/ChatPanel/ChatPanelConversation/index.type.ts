import type { ChatStatus } from 'ai';

import type { ChatModel, ChatSession, WisePenUIMessage } from '@/domains/Chat';

import type { SendOptions } from '../ChatInput/index.type';
import type { ChatPanelAgentDebugConfig } from '../index.type';

export interface ChatPanelConversationProps {
  agentDebug?: ChatPanelAgentDebugConfig;
  cancelling: boolean;
  canLoadMoreHistory: boolean;
  contextPreview?: string;
  currentModel: ChatModel | null;
  fullWidth: boolean;
  getUploadSessionId: () => Promise<string | undefined>;
  /** 当前会话尚无任何消息；welcome 展示由此判断，不再依赖 messages 数组 */
  isEmpty: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
  messages: WisePenUIMessage[];
  promoteDraftToolSelection: boolean;
  sessionBarOpen: boolean;
  sessionId?: string;
  status: ChatStatus;
  onCancel?: () => void | Promise<void>;
  onClearContext?: () => void;
  onCloseSessionBar: () => void;
  onLoadMoreHistory: () => Promise<void>;
  onSelectSession: (session: ChatSession) => void;
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
}
