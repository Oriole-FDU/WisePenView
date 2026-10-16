import { getToolName, isToolUIPart } from 'ai';

import type { WisePenUIMessage } from '@/domains/Chat';

interface ToolApprovalRequest {
  toolCallId: string;
  name: string;
  input: unknown;
}

/** 按消息顺序收集待审批工具，同一调用只进入一次审批队列。 */
export function listToolApprovalRequests(
  messages: readonly WisePenUIMessage[]
): ToolApprovalRequest[] {
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
