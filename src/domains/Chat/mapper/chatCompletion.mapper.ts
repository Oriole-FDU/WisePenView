import { readBrowserTimeContext } from '@/utils/browser';

import type {
  ChatCompletionRequest,
  ChatFrontendState,
  ClientToolCapability,
  ClientToolCapabilityRequest,
  SendSessionMessageOptions,
} from '../session/index.type';

function buildFrontendStates(options: SendSessionMessageOptions): ChatFrontendState[] {
  const frontendStates = [...(options.frontendStates ?? [])];

  const activeResources = (options.selectedResources ?? []).filter((resource) => resource.enabled);
  if (activeResources.length > 0) {
    frontendStates.push({
      key: 'selected_resources',
      value: activeResources.map((resource) => ({
        resource_id: resource.resourceId,
        resource_name: resource.resourceName,
        resource_type: resource.resourceType,
      })),
    });
  }

  // 浏览器时间上下文：每轮请求都重新读取浏览器本地时间
  frontendStates.push({ key: 'time', value: readBrowserTimeContext() });
  return frontendStates;
}

function unique(values?: readonly string[]): string[] {
  return Array.from(new Set(values ?? []));
}

function mapClientToolCapability(capability: ClientToolCapability): ClientToolCapabilityRequest {
  return {
    name: capability.name,
    description: capability.description,
    input_schema: capability.inputSchema,
  };
}

export function mapChatCompletionRequest(params: {
  defaultSessionId: string;
  defaultModel?: string;
  query: string;
  options?: SendSessionMessageOptions;
}): ChatCompletionRequest {
  const { defaultSessionId, defaultModel, query, options = {} } = params;
  const resolvedModel = options.model ?? defaultModel;
  const frontendStates = buildFrontendStates(options);
  const attachmentIds = (options.uploadedAttachments ?? [])
    .filter((attachment) => attachment.enabled)
    .map((attachment) => attachment.attachmentId);
  const onDemandSkillIds = unique(options.onDemandSkillIds);
  const clientToolCapabilities = (options.clientToolCapabilities ?? []).map(
    mapClientToolCapability
  );

  return {
    session_id: options.sessionId ?? defaultSessionId,
    query,
    ...(resolvedModel ? { model: resolvedModel } : {}),
    ...(options.providerId ? { provider_id: options.providerId } : {}),
    ...(options.runtimeOptions ? { runtime_options: options.runtimeOptions } : {}),
    ...(frontendStates.length > 0 ? { frontend_states: frontendStates } : {}),
    ...(attachmentIds.length > 0 ? { user_defined_attachment_ids: attachmentIds } : {}),
    tool_selection_default_enabled: true,
    ...(options.toolSelectionOverrides !== undefined
      ? { tool_selection_overrides: { ...options.toolSelectionOverrides } }
      : {}),
    ...(options.onDemandSkillIds !== undefined
      ? { user_defined_on_demand_skill_ids: onDemandSkillIds }
      : {}),
    ...(clientToolCapabilities.length > 0
      ? { client_tool_capabilities: clientToolCapabilities }
      : {}),
  };
}
