import { useRequiredContext } from '@/hooks/useRequiredContext';

import { GroupContext } from './GroupContext';

export function useGroupContext() {
  return useRequiredContext(GroupContext, 'GroupRoute');
}
