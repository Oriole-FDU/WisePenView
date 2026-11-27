import { type Context, useContext } from 'react';

import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export function useRequiredContext<T>(context: Context<T | null>, providerName: string): T {
  const value = useContext(context);
  if (value === null) {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.INTERNAL_STATE,
      source: 'client',
      meta: {
        reason: `必须在 ${providerName} 内使用该 Context`,
      },
    });
  }
  return value;
}
