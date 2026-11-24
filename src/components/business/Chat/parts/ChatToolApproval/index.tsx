import ToolApprovalDialog from './Dialog';
import type { ChatToolApprovalProps } from './index.type';
import { useChatToolApproval } from './useChatToolApproval';

/** 挂在 Chat 根旁路：有待批工具时弹出审批对话框。 */
function ChatToolApproval({ sessionId, phase, messages }: ChatToolApprovalProps) {
  const { pendingToolApproval, approvalSubmitting, handleApprovalDecision } = useChatToolApproval({
    sessionId,
    phase,
    messages,
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
