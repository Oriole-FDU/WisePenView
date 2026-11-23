import ToolApprovalDialog from '../ToolApprovalDialog';
import type { ChatToolApprovalProps } from './index.type';
import { useChatToolApproval } from './useChatToolApproval';

/** 挂在 Chat 根旁路：有待批工具时弹出审批对话框。 */
function ChatToolApproval({ sessionId, messages, status }: ChatToolApprovalProps) {
  const { pendingToolApproval, approvalSubmitting, handleApprovalDecision } = useChatToolApproval({
    sessionId,
    messages,
    status,
  });

  if (!pendingToolApproval) return null;

  return (
    <ToolApprovalDialog
      key={pendingToolApproval.toolCallId}
      name={pendingToolApproval.name}
      input={pendingToolApproval.input}
      submitting={approvalSubmitting}
      onDecision={(approved) => handleApprovalDecision(pendingToolApproval.toolCallId, approved)}
    />
  );
}

export default ChatToolApproval;
