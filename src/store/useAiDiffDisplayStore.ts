import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { zustandSessionStorage } from './sessionStorage';

export const DEFAULT_AI_DIFF_DISPLAY_MODE = AI_DIFF_DISPLAY_MODE.COMPARE;

type AiDiffDisplayState = {
  displayMode: AiDiffDisplayMode;
  setDisplayMode: (mode: AiDiffDisplayMode) => void;
};

export const useAiDiffDisplayStore = create<AiDiffDisplayState>()(
  persist(
    (set) => ({
      displayMode: DEFAULT_AI_DIFF_DISPLAY_MODE,
      setDisplayMode: (mode) => set({ displayMode: mode }),
    }),
    { name: 'ai-diff-display', storage: zustandSessionStorage }
  )
);

export function getAiDiffDisplayModeSnapshot(): AiDiffDisplayMode {
  return useAiDiffDisplayStore.getState().displayMode ?? DEFAULT_AI_DIFF_DISPLAY_MODE;
}

export const clearAiDiffDisplayStore = (): void => {
  useAiDiffDisplayStore.setState({ displayMode: DEFAULT_AI_DIFF_DISPLAY_MODE });
  useAiDiffDisplayStore.persist.clearStorage();
};
