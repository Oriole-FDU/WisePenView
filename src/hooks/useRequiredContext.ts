import { type Context, useContext } from 'react';

import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

export function useRequiredContext<T>(context: Context<T | null>): T {
  const value = useContext(context);
  if (value === null) {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.INTERNAL_STATE);
  }
  return value;
}
