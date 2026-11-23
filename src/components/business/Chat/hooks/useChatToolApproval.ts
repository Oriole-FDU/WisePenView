import type { ChatStatus } from 'ai';
import { getToolName, isToolUIPart } from 'ai';
import { useState } from 'react';

import type { WisePenUIMessage } from '@/domains/ChatSession';
import { getChatRouter } from '@/runtime/chat';

interface ToolApprovalRequest {
  toolCallId: string;
  name: string;
  input: unknown;
}

/** 按消息顺序收集待审批工具，同一调用只进入一次审批队列。 */
function listToolApprovalRequests(messages: readonly WisePenUIMessage[]): ToolApprovalRequest[] {
  const requests: ToolApprovalRequest[] = [];
  const seenIds = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part) || part.state !== 'approval-requested') continue;
      if (seenIds.has(part.toolCallId)) continue;

      seenIds.add(part.toolCallId);
      requests.push({
        toolCallId: part.toolCallId,
        name: part.title?.trim() || getToolName(part),
        input: part.input,
      });
    }
  }

  return requests;
}

type UseChatToolApprovalParams = {
  sessionId: string | undefined;
  messages: readonly WisePenUIMessage[];
  status: ChatStatus;
};

/** 高危工具审批：收集待批请求，批量回写 Router.approve。 */
export function useChatToolApproval({ sessionId, messages, status }: UseChatToolApprovalParams) {
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, boolean>>({});
  const approvalRequests = listToolApprovalRequests(messages);
  const approvalSubmitting = status === 'submitted' || status === 'streaming';
  const pendingToolApproval = sessionId
    ? approvalRequests.find((request) => approvalDecisions[request.toolCallId] === undefined)
    : undefined;

  const handleApprovalDecision = (toolCallId: string, approved: boolean) => {
    if (!sessionId || approvalSubmitting) return;
    const pendingToolCallIds = approvalRequests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = { ...approvalDecisions, [toolCallId]: approved };
    setApprovalDecisions(nextDecisions);
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    void getChatRouter()
      .approve(
        pendingToolCallIds.map((pendingId) => ({
          toolCallId: pendingId,
          approved: nextDecisions[pendingId] ?? false,
        }))
      )
      .finally(() => {
        setApprovalDecisions((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([id]) => !pendingToolCallIds.includes(id))
          )
        );
      });
  };

  return { pendingToolApproval, approvalSubmitting, handleApprovalDecision };
}
