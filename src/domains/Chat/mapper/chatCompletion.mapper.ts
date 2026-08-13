import type {
  ChatClientToolCapability,
  ChatClientToolCapabilityRequest,
  ChatCompletionRequest,
  ChatFrontendState,
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
  return frontendStates;
}

function unique(values?: readonly string[]): string[] {
  return Array.from(new Set(values ?? []));
}

function uniqueClientToolCapabilities(
  values?: readonly ChatClientToolCapability[]
): ChatClientToolCapability[] {
  return Array.from(
    new Map((values ?? []).map((capability) => [capability.name, capability])).values()
  );
}

function mapClientToolCapability(
  capability: ChatClientToolCapability
): ChatClientToolCapabilityRequest {
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
  const allowToolNames = unique(options.allowToolNames);
  const forceEnabledSkillIds = unique(options.forceEnabledSkillIds);
  const clientToolCapabilities = uniqueClientToolCapabilities(options.clientToolCapabilities);

  return {
    session_id: options.sessionId ?? defaultSessionId,
    query,
    ...(resolvedModel ? { model: resolvedModel } : {}),
    ...(options.providerId ? { provider_id: options.providerId } : {}),
    ...(options.runtimeOptions ? { runtime_options: options.runtimeOptions } : {}),
    ...(frontendStates.length > 0 ? { frontend_states: frontendStates } : {}),
    ...(attachmentIds.length > 0 ? { user_defined_attachment_ids: attachmentIds } : {}),
    ...(allowToolNames.length > 0 ? { user_defined_allow_tool_names: allowToolNames } : {}),
    ...(options.denyToolNames?.length
      ? { user_defined_deny_tool_names: options.denyToolNames }
      : {}),
    ...(options.onDemandSkillIds?.length
      ? { user_defined_on_demand_skill_ids: options.onDemandSkillIds }
      : {}),
    ...(forceEnabledSkillIds.length > 0
      ? { user_defined_force_enabled_skill_ids: forceEnabledSkillIds }
      : {}),
    ...(clientToolCapabilities.length > 0
      ? { client_tool_capabilities: clientToolCapabilities.map(mapClientToolCapability) }
      : {}),
  };
}
