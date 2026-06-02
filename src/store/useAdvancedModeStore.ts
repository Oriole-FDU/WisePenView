import { create } from 'zustand';

const STORAGE_KEY = 'wisepen:advanced-mode';

interface AdvancedModeState {
  advancedMode: boolean;
  setAdvancedMode: (enabled: boolean) => void;
  clearAdvancedMode: () => void;
}

const readStoredAdvancedMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
};

const writeStoredAdvancedMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
};

const clearStoredAdvancedMode = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const useAdvancedModeStore = create<AdvancedModeState>()((set) => ({
  advancedMode: readStoredAdvancedMode(),

  setAdvancedMode: (enabled) => {
    writeStoredAdvancedMode(enabled);
    set({ advancedMode: enabled });
  },

  clearAdvancedMode: () => {
    clearStoredAdvancedMode();
    set({ advancedMode: false });
  },
}));

export const clearAdvancedModeStore = (): void => {
  clearStoredAdvancedMode();
  useAdvancedModeStore.setState({ advancedMode: false });
};
