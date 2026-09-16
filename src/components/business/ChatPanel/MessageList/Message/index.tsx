import { memo } from 'react';

import type { ChatModel, WisePenUIMessage } from '@/domains/Chat';

import AssistantMessage from './Assistant';
import UserMessage from './User';

interface MessageProps {
  message: WisePenUIMessage;
  model: ChatModel | null;
  streaming: boolean;
  fullWidth: boolean;
  approvalDecisions: Readonly<Record<string, boolean>>;
  approvalSubmitting: boolean;
  onApprovalDecision: (toolCallId: string, approved: boolean) => void;
}

function Message({
  message,
  model,
  streaming,
  fullWidth,
  approvalDecisions,
  approvalSubmitting,
  onApprovalDecision,
}: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} fullWidth={fullWidth} />;
  return (
    <AssistantMessage
      message={message}
      model={model}
      streaming={streaming}
      approvalDecisions={approvalDecisions}
      approvalSubmitting={approvalSubmitting}
      onApprovalDecision={onApprovalDecision}
    />
  );
}

export default memo(Message);
