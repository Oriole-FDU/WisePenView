import { useContext } from 'react';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { ChatInputFileContext, type ChatInputFileContextValue } from './ChatInputFileContextValue';

export function useChatInputFiles(): ChatInputFileContextValue {
  const context = useContext(ChatInputFileContext);
  if (!context) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useChatInputFiles must be used within ChatInputFileProvider',
    });
  }
  return context;
}
