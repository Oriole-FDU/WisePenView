import { clearFrontendStates, FRONTEND_STATE_SOURCE } from '@/frontendState';
import { useResourceChatContextStore } from '@/layouts/Resource/_store/useResourceChatContextStore';

import type { ResourceChatContext } from './resourceChatModel';

/**
 * 资源聊天选区上下文的共享动作。
 *
 * 选区上下文归聊天上下文 store；这里提供无 Provider 的读写入口，供资源对话面板、
 * 编辑器宿主能力与课程学习页复用。
 */
export const resourceChatContextActions = {
  setContext: (context: ResourceChatContext) =>
    useResourceChatContextStore.getState().setContext(context),
  clearContext: (context?: ResourceChatContext) => {
    const current = useResourceChatContextStore.getState().context;
    if (context && current !== context) return;
    useResourceChatContextStore.getState().clearContext(context);
    clearFrontendStates({ source: FRONTEND_STATE_SOURCE.SELECTION });
  },
};
