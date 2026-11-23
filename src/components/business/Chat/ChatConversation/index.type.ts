import type { ChatStatus } from 'ai';

import type { ChatAgentOption, ChatModel } from '@/domains/ChatConfig';
import type { ChatSession, WisePenUIMessage } from '@/domains/ChatSession';

import type { SendOptions } from '../send.type';
import type { WelcomeScreenConfig } from '../WelcomeConfigurable/Starter/index.type';

export interface ChatConversationProps {
  messages: readonly WisePenUIMessage[];
  status: ChatStatus;
  isEmpty: boolean;
  currentModel: ChatModel | null;
  cancelling: boolean;
  currentSessionId?: string;
  sessionBarOpen: boolean;
  promoteDraftToolSelection: boolean;
  canLoadMoreHistory: boolean;
  loadingInitialHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  onCancel: () => void | Promise<void>;
  onCloseSessionBar: () => void;
  onSelectSession: (session: ChatSession) => void;
  getUploadSessionId: () => Promise<string | undefined>;
  /** 输入区 Agent 选择器的额外选项与首选 Agent */
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  fullWidth: boolean;
  contextPreview?: string;
  onClearContext?: () => void;
  /** 发送入口由顶层组合：登录校验、宿主守卫后再落到 Router */
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
  /** 新建对话空态 Welcome；不传则仅 Hero + 标题 */
  welcomeConfig?: WelcomeScreenConfig;
}
