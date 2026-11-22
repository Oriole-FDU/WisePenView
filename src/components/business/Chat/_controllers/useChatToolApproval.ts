import { toast } from '@heroui/react';
import { useLatest } from 'ahooks';
import { useRef, useState } from 'react';

import type { WisePenUIMessage } from '@/domains/ChatSession';
import type { ToolApprovalStatusRequest } from '@/domains/ChatTurn';
import { parseErrorMessage } from '@/utils/error';

import { listToolApprovalRequests } from './toolApprovalModel';

interface UseChatToolApprovalOptions {
  sessionId?: string;
  messages: readonly WisePenUIMessage[];
  /** 待审批项全部有结论后交给 Runtime 选择续跑路径。 */
  submitApprovals: (toolApprovalStatus: ToolApprovalStatusRequest[]) => Promise<void>;
}

/** 审批决定与提交态独立于生成态；关闭弹窗不产生决定。 */
export function useChatToolApproval({
  sessionId,
  messages,
  submitApprovals,
}: UseChatToolApprovalOptions) {
  const [state, setState] = useState({
    sessionId,
    decisions: {} as Record<string, boolean>,
    submitting: false,
    lifecycle: {},
  });
  if (state.sessionId !== sessionId) {
    setState({ sessionId, decisions: {}, submitting: false, lifecycle: {} });
  }
  const latestState = useLatest(state);
  const submissionRef = useRef<{ lifecycle: object } | null>(null);
  const requests = listToolApprovalRequests(messages);
  const decisions = state.sessionId === sessionId ? state.decisions : {};
  const submitting = state.sessionId === sessionId && state.submitting;
  const pendingRequest = sessionId
    ? requests.find((request) => decisions[request.toolCallId] === undefined)
    : undefined;

  const decide = (toolCallId: string, approved: boolean) => {
    if (!sessionId || submissionRef.current?.lifecycle === state.lifecycle) return;
    const pendingToolCallIds = requests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = { ...decisions, [toolCallId]: approved };
    setState({ ...state, decisions: nextDecisions, submitting: false });
    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    const toolApprovalStatus = pendingToolCallIds.map((pendingId) => ({
      tool_call_id: pendingId,
      approved: nextDecisions[pendingId],
    }));
    const submission = { lifecycle: state.lifecycle };
    submissionRef.current = submission;
    setState({ ...state, decisions: nextDecisions, submitting: true });
    void submitApprovals(toolApprovalStatus)
      .catch((error: unknown) => {
        if (latestState.current.lifecycle !== submission.lifecycle) return;
        toast.danger(parseErrorMessage(error));
        setState({ ...state, decisions: {}, submitting: false });
      })
      .finally(() => {
        if (submissionRef.current === submission) submissionRef.current = null;
        if (latestState.current.lifecycle !== submission.lifecycle) return;
        // 成功决定保留到会话结束，避免消息尚未更新时重新弹出同一审批。
        setState((current) => ({ ...current, submitting: false }));
      });
  };

  return { decide, pending: pendingRequest, submitting };
}
