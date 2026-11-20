import type { ChatStatus } from 'ai';

import type { ChatAgentOption, ChatModel } from '@/domains/ChatConfig';
import type { UseChatTurnResult, WisePenUIMessage } from '@/domains/ChatTurn';

import type { useChatSessionController } from '../_controllers/useChatSessionController';
import type { SendOptions } from '../send.type';
import type { WelcomeScreenConfig } from '../WelcomeConfigurable/Starter/index.type';

export interface ChatConversationTurn {
  cancel: () => Promise<void>;
  cancelling: boolean;
  connectActive: boolean;
  currentModel: ChatModel | null;
  history: UseChatTurnResult['history'];
  isEmpty: boolean;
  messages: WisePenUIMessage[];
  status: ChatStatus;
}

export interface ChatConversationProps {
  turn: ChatConversationTurn;
  session: ReturnType<typeof useChatSessionController>;
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  fullWidth: boolean;
  contextPreview?: string;
  onClearContext?: () => void;
  onSend: (text: string, opts?: SendOptions) => boolean | void | Promise<boolean | void>;
  welcomeConfig?: WelcomeScreenConfig;
}
