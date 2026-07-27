import { useResourceDisplayNameStore } from '@/domains/Resource/store/useResourceDisplayNameStore';

export function useResourceDisplayName(
  resourceId: string | undefined,
  fallbackName: string | undefined,
  emptyName: string
): string {
  const stored = useResourceDisplayNameStore((s) =>
    resourceId != null && resourceId !== '' ? s.byResourceId[resourceId] : undefined
  );

  return (() => {
    const picked = stored?.trim() || fallbackName?.trim() || '';
    return picked === '' ? emptyName : picked;
  })();
}
