import { getToolName, isToolUIPart } from 'ai';
import { useState } from 'react';

import { useChatSessions } from '@/runtime/chat';
import { notifyError } from '@/utils/error';

import type { ChatToolApprovalProps } from './index.type';

interface ToolApprovalRequest {
  toolCallId: string;
  name: string;
  input: unknown;
}

function listToolApprovalRequests(message: ChatToolApprovalProps['messages'][number] | undefined) {
  const requests: ToolApprovalRequest[] = [];
  const seenIds = new Set<string>();

  for (const part of message?.parts ?? []) {
    if (!isToolUIPart(part) || part.state !== 'approval-requested') continue;
    if (seenIds.has(part.toolCallId)) continue;

    seenIds.add(part.toolCallId);
    requests.push({
      toolCallId: part.toolCallId,
      name: part.title?.trim() || getToolName(part),
      input: part.input,
    });
  }

  return requests;
}

/** 高危工具审批：收集并提交同一回合的审批决定。 */
export function useChatToolApproval({ sessionId, phase, messages }: ChatToolApprovalProps) {
  const sessions = useChatSessions();
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, boolean>>({});
  const [submittingToolCallIds, setSubmittingToolCallIds] = useState<ReadonlySet<string>>();
  const approvalRequests =
    phase === 'streaming' || phase === 'hanged' ? listToolApprovalRequests(messages.at(-1)) : [];
  const approvalSubmitting = approvalRequests.some((request) =>
    submittingToolCallIds?.has(request.toolCallId)
  );
  const pendingToolApproval =
    approvalRequests.find((request) => approvalDecisions[request.toolCallId] === undefined) ??
    (approvalSubmitting ? approvalRequests.at(-1) : undefined);

  const handleApprovalDecision = (toolCallId: string, approved: boolean) => {
    if (!sessionId || approvalSubmitting) return;
    const pendingToolCallIds = approvalRequests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = Object.fromEntries(
      Object.entries(approvalDecisions).filter(([id]) => pendingToolCallIds.includes(id))
    );
    nextDecisions[toolCallId] = approved;
    setApprovalDecisions(nextDecisions);
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    const submittedIds = new Set(pendingToolCallIds);
    setSubmittingToolCallIds(submittedIds);
    void sessions
      .withSession(sessionId, (runtime) =>
        runtime.approve(
          pendingToolCallIds.map((pendingId) => ({
            toolCallId: pendingId,
            approved: nextDecisions[pendingId] ?? false,
          }))
        )
      )
      .catch((error: unknown) => {
        setApprovalDecisions((current) =>
          Object.fromEntries(Object.entries(current).filter(([id]) => !submittedIds.has(id)))
        );
        notifyError(error);
      })
      .finally(() => {
        setSubmittingToolCallIds((current) => (current === submittedIds ? undefined : current));
      });
  };

  return { pendingToolApproval, approvalSubmitting, handleApprovalDecision };
}
