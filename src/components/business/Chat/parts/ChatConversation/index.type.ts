import type { ChatSession, WisePenUIMessage } from '@/domains/ChatSession';
import type { SessionPhase } from '@/runtime/chat';

import type { ChatHostAgentPort, ChatProps } from '../../index.type';
import type { WelcomeScreenConfig } from '../Welcome/Starter/index.type';

/** 当前会话的消息、回合状态与历史加载进度。 */
export interface ChatConversationViewPort {
  messages: readonly WisePenUIMessage[];
  phase: SessionPhase;
  canLoadMoreHistory: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
}

/** 会话栏开合与当前会话（来自壳层 chrome） */
export interface ChatConversationSessionPort {
  sessionId?: string;
  sessionBarOpen: boolean;
  onCloseSessionBar: () => void;
  onSelectSession: (session: ChatSession) => void;
}

/**
 * 宿主 / 资源侧端口：资源会话、Agent 注入、上下文预览。
 * 清上下文走 `resourceChat.clearContext`，不再单独透传。
 */
export interface ChatConversationHostPort {
  resourceId?: string;
  resourceChat?: ChatProps['resourceChat'];
  hostAgentPort?: ChatHostAgentPort;
  contextPreview?: string;
}

export interface ChatConversationProps {
  view: ChatConversationViewPort;
  session: ChatConversationSessionPort;
  host?: ChatConversationHostPort;
  fullWidth: boolean;
  /** 新建对话空态 Welcome；不传则用默认 config */
  welcomeConfig?: WelcomeScreenConfig;
}
