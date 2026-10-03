import { useRequiredContext } from '@/hooks/useRequiredContext';

import { ChatInputFileContext, type ChatInputFileContextValue } from './ChatInputFileContext';

export function useChatInputFiles(): ChatInputFileContextValue {
  return useRequiredContext(ChatInputFileContext, 'ChatInputFileProvider');
}
