import { createContext, useContext } from 'react';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';

const AiDiffDisplayModeContext = createContext<AiDiffDisplayMode>(AI_DIFF_DISPLAY_MODE.COMPARE);

export const AiDiffDisplayModeProvider = AiDiffDisplayModeContext.Provider;

export function useAiDiffDisplayModeContext(): AiDiffDisplayMode {
  return useContext(AiDiffDisplayModeContext);
}
