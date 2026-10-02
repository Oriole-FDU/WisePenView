import { useRequiredContext } from '@/hooks/useRequiredContext';

import { ResourceChatBindingContext } from './ResourceChatBindingContext';

export function useResourceChatBinding() {
  return useRequiredContext(ResourceChatBindingContext, 'ResourceChatBindingProvider');
}
