import type { ChatStatus } from 'ai';

import type { ChatSession, WisePenUIMessage } from '@/domains/ChatSession';

import type { ChatHostAgentPort, ChatProps } from '../../index.type';
import type { WelcomeScreenConfig } from '../Welcome/Starter/index.type';

export interface ChatConversationProps {
  messages: readonly WisePenUIMessage[];
  status: ChatStatus;
  isEmpty: boolean;
  currentSessionId?: string;
  sessionBarOpen: boolean;
  canLoadMoreHistory: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
  onCloseSessionBar: () => void;
  onSelectSession: (session: ChatSession) => void;
  fullWidth: boolean;
  contextPreview?: string;
  onClearContext?: () => void;
  resourceId?: string;
  resourceChat?: ChatProps['resourceChat'];
  hostAgentPort?: ChatHostAgentPort;
  /** 新建对话空态 Welcome；不传则仅 Hero + 标题 */
  welcomeConfig?: WelcomeScreenConfig;
}
