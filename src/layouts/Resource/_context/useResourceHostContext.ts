import { useRequiredContext } from '@/hooks/useRequiredContext';

import { ResourceHostContext } from './ResourceHostContext';

export function useResourceHostContext() {
  return useRequiredContext(ResourceHostContext, 'ResourceHost');
}

export function useResourceHostId() {
  return useResourceHostContext().hostId;
}

export function useResourceHostChatContextActions() {
  const { openChatPanel, setChatContext, clearChatContext } = useResourceHostContext();
  return { openChatPanel, setChatContext, clearChatContext };
}
