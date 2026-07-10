import { getApiBaseURL } from '@/apis/apiServerAddr';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback } from 'react';
import type {
  ChatCompletionRequest,
  ChatFrontendState,
  SendSessionMessageOptions,
  UseChatSessionOptions,
} from './index.type';

// 调用时求值：apiServerAddr 会在生产环境随网络变化运行时切换，固化会失效
const getCompletionsApi = (): string => `${getApiBaseURL()}chat/completions`;

const devDeveloperHeader = import.meta.env.DEV ? import.meta.env.VITE_X_DEVELOPER.trim() : '';
const NOTE_AI_DIFF_SKILL_ID = 'wisepen-note-ai-diff';
const NOTE_AI_DIFF_TOOL_NAMES = ['read_note_aixml', 'apply_current_note_ai_diff_plan'] as const;

const buildChatFetchInit = (init?: RequestInit): RequestInit => {
  const headers = new Headers(init?.headers);
  if (devDeveloperHeader) {
    headers.set('x-developer', devDeveloperHeader);
  }
  return {
    ...init,
    credentials: 'include',
    headers,
  };
};

const buildFrontendStates = ({
  selectedText,
  selectedNoteScope,
  enableSelected,
  workspaceContext,
  selectedResources,
}: SendSessionMessageOptions): ChatFrontendState[] => {
  const frontendStates: ChatFrontendState[] = [];
  const selectedValue = selectedText?.trim();

  if (selectedValue) {
    frontendStates.push({
      key: 'selected_text',
      value: selectedValue,
      disabled: !enableSelected,
    });
  }

  if (selectedNoteScope) {
    frontendStates.push({
      key: 'selected_note_scope',
      value: selectedNoteScope,
      disabled: !enableSelected,
    });
  }

  const canUseWorkspaceContext =
    workspaceContext?.editorType !== 'note' ||
    !workspaceContext?.noteSyncStatus ||
    workspaceContext.noteSyncStatus === 'connected';

  if (workspaceContext?.resourceId && canUseWorkspaceContext) {
    frontendStates.push({
      key: 'workspace_open_resource',
      value: {
        resource_id: workspaceContext.resourceId,
        resource_type: workspaceContext.resourceType,
        viewer: workspaceContext.viewer,
        editor_type: workspaceContext.editorType ?? workspaceContext.viewer,
      },
    });

    const noteClientStateVector =
      workspaceContext.editorType === 'note'
        ? workspaceContext.getNoteClientStateVector?.()
        : undefined;
    if (noteClientStateVector) {
      frontendStates.push({
        key: 'note_client_state_vector',
        value: noteClientStateVector,
        disabled: true,
      });
    }
  }

  const activeResources = (selectedResources ?? []).filter((resource) => resource.enabled);
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
};

const buildRequestBody = ({
  defaultSessionId,
  defaultModel,
  query,
  options,
}: {
  defaultSessionId: string;
  defaultModel?: string;
  query: string;
  options?: SendSessionMessageOptions;
}): ChatCompletionRequest => {
  const resolvedModel = options?.model ?? defaultModel;
  const frontendStates = buildFrontendStates(options ?? {});
  const isNoteWorkspace = options?.workspaceContext?.editorType === 'note';
  const attachmentIds = (options?.uploadedAttachments ?? [])
    .filter((attachment) => attachment.enabled)
    .map((attachment) => attachment.attachmentId);
  const allowToolNames = mergeUnique(
    options?.allowToolNames,
    isNoteWorkspace ? NOTE_AI_DIFF_TOOL_NAMES : undefined
  );
  const forceEnabledSkillIds = mergeUnique(
    options?.forceEnabledSkillIds,
    isNoteWorkspace ? [NOTE_AI_DIFF_SKILL_ID] : undefined
  );

  return {
    session_id: options?.sessionId ?? defaultSessionId,
    query,
    ...(resolvedModel ? { model: resolvedModel } : {}),
    ...(options?.providerId ? { provider_id: options.providerId } : {}),
    ...(options?.runtimeOptions ? { runtime_options: options.runtimeOptions } : {}),
    ...(frontendStates.length > 0 ? { frontend_states: frontendStates } : {}),
    ...(attachmentIds.length > 0 ? { user_defined_attachment_ids: attachmentIds } : {}),
    ...(allowToolNames.length > 0
      ? { user_defined_allow_tool_names: allowToolNames }
      : {}),
    ...(options?.denyToolNames && options.denyToolNames.length > 0
      ? { user_defined_deny_tool_names: options.denyToolNames }
      : {}),
    ...(options?.onDemandSkillIds && options.onDemandSkillIds.length > 0
      ? { user_defined_on_demand_skill_ids: options.onDemandSkillIds }
      : {}),
    ...(forceEnabledSkillIds.length > 0
      ? { user_defined_force_enabled_skill_ids: forceEnabledSkillIds }
      : {}),
  };
};

const mergeUnique = (
  first?: readonly string[],
  second?: readonly string[]
): string[] => {
  return Array.from(new Set([...(first ?? []), ...(second ?? [])]));
};

/**
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐后端 ChatRequest 字段
 * 3) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({ sessionId, model }: UseChatSessionOptions) => {
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: getCompletionsApi(),
      fetch: (input, init) => fetch(input, buildChatFetchInit(init)),
    }),
  });

  const sendSessionMessage = useCallback(
    async (query: string, options?: SendSessionMessageOptions) => {
      const requestBody = buildRequestBody({
        defaultSessionId: sessionId,
        defaultModel: model,
        query,
        options,
      });
      await chat.sendMessage({ text: query }, { body: requestBody });
    },
    [chat, model, sessionId]
  );

  return {
    ...chat,
    sendSessionMessage,
  };
};
