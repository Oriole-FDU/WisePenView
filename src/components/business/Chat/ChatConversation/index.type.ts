import type { ChatStatus } from 'ai';

import type { ChatAgentOption, ChatModel } from '@/domains/ChatConfig';
import type { UseChatRuntimeResult, WisePenUIMessage } from '@/domains/ChatTurn';

import type { useChatSessionController } from '../_controllers/useChatSessionController';
import type { SendOptions } from '../send.type';
import type { WelcomeScreenConfig } from '../WelcomeConfigurable/Starter/index.type';

/** 对话区消费的 turn 视图：runtime 数据面 + 发送处维护的 cancel / currentModel。 */
export interface ChatConversationTurn {
  cancel: () => Promise<void>;
  cancelling: boolean;
  currentModel: ChatModel | null;
  history: UseChatRuntimeResult['history'];
  isEmpty: boolean;
  messages: WisePenUIMessage[];
  status: ChatStatus;
}

export interface ChatConversationProps {
  /** 对话域：消息、运行状态、历史分页与取消；由对话区按需解包 */
  turn: ChatConversationTurn;
  /** 会话域：当前会话身份、会话列表浮层与新建会话；由对话区按需解包 */
  session: ReturnType<typeof useChatSessionController>;
  /** 输入区 Agent 选择器的额外选项与首选 Agent */
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  fullWidth: boolean;
  contextPreview?: string;
  onClearContext?: () => void;
  /** 发送入口由顶层组合：登录、宿主守卫、资源门禁后再落到 runtime.send */
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
  /** 新建对话空态 Welcome；不传则仅 Hero + 标题 */
  welcomeConfig?: WelcomeScreenConfig;
}
