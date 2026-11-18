import type { ChatModel } from '@/domains/ChatConfig';
import type { WisePenUIMessage } from '@/domains/ChatTurn';

export interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
}
