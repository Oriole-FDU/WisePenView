import { useStore } from 'zustand';

import { resourceDisplayNameCache } from '@/domains/Resource/session/resourceDisplayNameCache';

export function useResourceDisplayName(
  resourceId: string | undefined,
  fallbackName: string | undefined,
  emptyName: string
): string {
  const stored = useStore(resourceDisplayNameCache, (s) =>
    resourceId != null && resourceId !== '' ? s.byResourceId[resourceId] : undefined
  );

  return (() => {
    const picked = stored?.trim() || fallbackName?.trim() || '';
    return picked === '' ? emptyName : picked;
  })();
}
