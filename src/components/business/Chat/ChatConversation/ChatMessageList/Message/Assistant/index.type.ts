import type { ChatModel, WisePenUIMessage } from '@/domains/Chat';

export interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
}
