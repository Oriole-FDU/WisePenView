import type { WisePenUIMessage } from '@/domains/Chat';
import type { ChatModel } from '@/domains/ChatConfig';

export interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
}
