import type { ChatModel, WisePenUIMessage } from '@/domains/Chat';

export interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
  approvalDecisions: Readonly<Record<string, boolean>>;
  approvalSubmitting: boolean;
  onApprovalDecision: (toolCallId: string, approved: boolean) => void;
}
