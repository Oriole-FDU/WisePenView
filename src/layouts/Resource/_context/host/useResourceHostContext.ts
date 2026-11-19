import { useRequiredContext } from '@/hooks/useRequiredContext';

import { ResourceHostContext } from './ResourceHostContext';

export function useResourceHostContext() {
  return useRequiredContext(ResourceHostContext);
}

export function useResourceHostId() {
  return useResourceHostContext().hostId;
}
