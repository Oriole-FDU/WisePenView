/**
 * 从消息中解析待审批工具调用，收集用户决定并提交。
 */
import type { ChatStatus } from 'ai';
import { useState } from 'react';

import type { WisePenUIMessage } from '../../entity/message';
import type { ToolApprovalStatusRequest } from '../../service/index.type';
import type { ToolApprovalRequest } from './toolApprovalModel';
import { listToolApprovalRequests } from './toolApprovalModel';

export interface UseChatToolApprovalOptions {
  sessionId?: string;
  messages: readonly WisePenUIMessage[];
  status: ChatStatus;
  submitToolApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
  onError?: (error: Error) => void;
}

export interface UseChatToolApprovalResult {
  decide: (toolCallId: string, approved: boolean) => void;
  pending: ToolApprovalRequest | undefined;
  submitting: boolean;
}

export function useChatToolApproval({
  sessionId,
  messages,
  status,
  submitToolApprovals,
  onError,
}: UseChatToolApprovalOptions): UseChatToolApprovalResult {
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  const requests = listToolApprovalRequests(messages);
  const pendingRequest = sessionId
    ? requests.find((request) => decisions[request.toolCallId] === undefined)
    : undefined;
  const streamBusy = status === 'submitted' || status === 'streaming';

  const decide = (toolCallId: string, approved: boolean) => {
    // 无 session 或流忙碌时忽略
    if (!sessionId || streamBusy) return;

    // 非本批待审批 id 忽略
    const pendingToolCallIds = requests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    // 本批未收齐则只记决定，不提交
    const nextDecisions = { ...decisions, [toolCallId]: approved };
    setDecisions(nextDecisions);
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    // 收齐后一次性提交；结束时清掉本批决定（失败也清，避免卡死）
    const toolApprovalStatus: ToolApprovalStatusRequest[] = pendingToolCallIds.map((pendingId) => ({
      toolCallId: pendingId,
      approved: nextDecisions[pendingId] ?? false,
    }));
    void submitToolApprovals(toolApprovalStatus)
      .catch((error) => {
        if (error instanceof Error) onError?.(error);
      })
      .finally(() => {
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
    submitting: streamBusy,
  };
}
