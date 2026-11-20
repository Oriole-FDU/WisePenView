/**
 * 从消息派生待审批项，收集决定并在收齐后提交。
 */
import type { ChatStatus } from 'ai';

import type { WisePenUIMessage } from '../../entity/message';
import type { ToolApprovalStatusRequest } from '../../service/index.type';
import { listToolApprovalRequests, type ToolApprovalRequest } from './toolApprovalModel';

export type { ToolApprovalRequest };

export interface ToolApprovalOptions {
  getMessages: () => readonly WisePenUIMessage[];
  getStatus: () => ChatStatus;
  submitToolApprovals: (statuses: ToolApprovalStatusRequest[]) => Promise<void>;
  onError?: (error: Error) => void;
  onChange?: () => void;
}

export class ToolApproval {
  private decisions: Record<string, boolean> = {};
  private readonly options: ToolApprovalOptions;

  constructor(options: ToolApprovalOptions) {
    this.options = options;
  }

  get pending(): ToolApprovalRequest | undefined {
    const requests = listToolApprovalRequests(this.options.getMessages());
    return requests.find((request) => this.decisions[request.toolCallId] === undefined);
  }

  get submitting(): boolean {
    const status = this.options.getStatus();
    return status === 'submitted' || status === 'streaming';
  }

  decide(toolCallId: string, approved: boolean): void {
    if (this.submitting) return;

    const requests = listToolApprovalRequests(this.options.getMessages());
    const pendingToolCallIds = requests.map((request) => request.toolCallId);
    if (!pendingToolCallIds.includes(toolCallId)) return;

    const nextDecisions = { ...this.decisions, [toolCallId]: approved };
    this.decisions = nextDecisions;
    this.options.onChange?.();

    if (pendingToolCallIds.some((pendingId) => nextDecisions[pendingId] === undefined)) return;

    const toolApprovalStatus: ToolApprovalStatusRequest[] = pendingToolCallIds.map((pendingId) => ({
      toolCallId: pendingId,
      approved: nextDecisions[pendingId] ?? false,
    }));

    void this.options
      .submitToolApprovals(toolApprovalStatus)
      .catch((error) => {
        if (error instanceof Error) this.options.onError?.(error);
      })
      .finally(() => {
        this.decisions = Object.fromEntries(
          Object.entries(this.decisions).filter(([id]) => !pendingToolCallIds.includes(id))
        );
        this.options.onChange?.();
      });
  }

  dispose(): void {
    this.decisions = {};
  }
}
