import type { ChatStatus } from 'ai';
import { useState } from 'react';

import type { ToolApprovalStatusRequest, WisePenUIMessage } from '@/domains/Chat';

import { listToolApprovalRequests } from './toolApprovalModel';

interface UseChatToolApprovalOptions {
  sessionId?: string;
  messages: readonly WisePenUIMessage[];
  status: ChatStatus;
  /** Chat 运行时的恢复能力：待审批项全部有结论后用它续跑同一轮对话 */
  recover: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
}

/**
 * 审批域：一轮对话中工具审批请求的挂起状态与决定。
 *
 * 只读消息与运行状态，决定收敛后交给传入的 recover 续跑；不持有会话与历史。
 */
export function useChatToolApproval({
  sessionId,
  messages,
  status,
  recover,
}: UseChatToolApprovalOptions) {
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  const requests = listToolApprovalRequests(messages);
  const pendingRequest = sessionId
    ? requests.find((request) => decisions[request.toolCallId] === undefined)
    : undefined;
  const running = status === 'submitted' || status === 'streaming';

  /** 记录审批决定；待审批项全部有结论后，用该结论恢复同一轮对话。 */
  const decide = (toolCallId: string, approved: boolean) => {
    if (!sessionId || running) return;

    const pendingToolCallIds = requests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = { ...decisions, [toolCallId]: approved };
    setDecisions(nextDecisions);
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    const toolApprovalStatus = pendingToolCallIds.map((pendingId) => ({
      tool_call_id: pendingId,
      approved: nextDecisions[pendingId] ?? false,
    }));
    void recover(toolApprovalStatus).finally(() => {
      setDecisions((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !pendingToolCallIds.includes(id))
        )
      );
    });
  };

  return {
    decide,
    pending: pendingRequest,
    submitting: running,
  };
}
