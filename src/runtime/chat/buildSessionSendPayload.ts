import { readFrontendStates } from '@/frontendState';

import type { SessionSendOptions, SessionUploadedAttachment } from './_common';

export type BuildSessionSendPayloadInput = {
  resourceId?: string;
  modelId: string;
  providerId?: string;
  uploadedAttachments?: SessionUploadedAttachment[];
  toolSelectionOverrides?: Record<string, boolean>;
  selectedSkillIds?: string[];
  resourceOnDemandSkillIds?: readonly string[];
};

export type BuildSessionSendPayloadResult =
  | {
      ok: true;
      options: SessionSendOptions;
      finishSend: () => void;
    }
  | {
      ok: false;
      reason: 'resourceMismatch';
    };

/** 把面板侧发送上下文收成 Runtime / Router 可消费的 SessionSendOptions */
export function buildSessionSendPayload(
  input: BuildSessionSendPayloadInput
): BuildSessionSendPayloadResult {
  const frontendState = readFrontendStates({ resourceId: input.resourceId });
  if (frontendState.resourceMismatch) {
    return { ok: false, reason: 'resourceMismatch' };
  }

  const selectedResourceState = frontendState.states.find(
    (state) => state.key === 'selected_resources'
  );
  const selectedResources =
    selectedResourceState?.key === 'selected_resources'
      ? selectedResourceState.value.map((resource) => ({
          resourceId: resource.resource_id,
          resourceName: resource.resource_name,
          resourceType: resource.resource_type,
          enabled: true,
        }))
      : undefined;

  const onDemandSkillIds =
    input.selectedSkillIds !== undefined || input.resourceOnDemandSkillIds !== undefined
      ? Array.from(
          new Set([...(input.selectedSkillIds ?? []), ...(input.resourceOnDemandSkillIds ?? [])])
        )
      : undefined;

  return {
    ok: true,
    options: {
      model: input.modelId,
      providerId: input.providerId,
      frontendStates: frontendState.states,
      selectedResources,
      uploadedAttachments: input.uploadedAttachments,
      toolSelectionOverrides: input.toolSelectionOverrides,
      onDemandSkillIds,
    },
    finishSend: frontendState.finishSend,
  };
}
