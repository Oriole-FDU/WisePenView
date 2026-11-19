import { type Context, useContext } from 'react';

import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

export function useRequiredContext<T>(context: Context<T | null>, providerName: string): T {
  const value = useContext(context);
  if (value === null) {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE, {
      reason: `必须在 ${providerName} 内使用该 Context`,
    });
  }
  return value;
}
