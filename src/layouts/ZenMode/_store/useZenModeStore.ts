import { CHAT_PANEL_MIN_WIDTH, clampZenChatPanelWidth } from '@/constants/layoutScale';
import { buildDriveNodeScope, type DriveNodeScope } from '@/domains/Drive';
import { registerStore } from '@/store/lifecycle';
import { createStoreJSONStorage } from '@/store/persistence';
import type { ResourceTarget } from '@/utils/navigation/resourceTarget';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeZenModeTarget } from '../zenModeResource';

const ZEN_PRIMARY_PANE_ID = 'zen-primary';
const ZEN_SECONDARY_PANE_ID = 'zen-secondary';
export const ZEN_PANE_IDS = [ZEN_PRIMARY_PANE_ID, ZEN_SECONDARY_PANE_ID] as const;

export type ZenPaneId = (typeof ZEN_PANE_IDS)[number];

export interface ZenPaneState {
  paneId: ZenPaneId;
  target?: ResourceTarget;
  location: ZenPaneLocation;
}

export interface ZenPaneLocation {
  scope: DriveNodeScope;
  resource?: {
    resourceId: string;
    parentNodeId: string;
    nodeId?: string;
  };
}

interface ZenModeState {
  panes: Record<ZenPaneId, ZenPaneState>;
  activePaneId: ZenPaneId;
  primaryPanePercentage: number;
  chatWidth: number;
  setPaneTarget: (paneId: ZenPaneId, target: ResourceTarget) => void;
  setPaneLocation: (paneId: ZenPaneId, location: ZenPaneLocation) => void;
  enterWithTarget: (target: ResourceTarget, location?: ZenPaneLocation) => boolean;
  clearPane: (paneId: ZenPaneId) => void;
  setActivePane: (paneId: ZenPaneId) => void;
  setPrimaryPanePercentage: (percentage: number) => void;
  setChatWidth: (width: number) => void;
}

const DEFAULT_PANES: Record<ZenPaneId, ZenPaneState> = {
  [ZEN_PRIMARY_PANE_ID]: {
    paneId: ZEN_PRIMARY_PANE_ID,
    location: { scope: buildDriveNodeScope() },
  },
  [ZEN_SECONDARY_PANE_ID]: {
    paneId: ZEN_SECONDARY_PANE_ID,
    location: { scope: buildDriveNodeScope() },
  },
};

const DEFAULT_ZEN_MODE_STATE: Pick<
  ZenModeState,
  'panes' | 'activePaneId' | 'primaryPanePercentage' | 'chatWidth'
> = {
  panes: DEFAULT_PANES,
  activePaneId: ZEN_PRIMARY_PANE_ID,
  primaryPanePercentage: 50,
  chatWidth: CHAT_PANEL_MIN_WIDTH,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max);

export const useZenModeStore = create<ZenModeState>()(
  persist(
    (set) => ({
      ...DEFAULT_ZEN_MODE_STATE,
      setPaneTarget: (paneId, target) =>
        set((state) => {
          const normalizedTarget = normalizeZenModeTarget(target);
          if (!normalizedTarget) return state;
          return {
            panes: {
              ...state.panes,
              [paneId]: { ...state.panes[paneId], target: normalizedTarget },
            },
          };
        }),
      setPaneLocation: (paneId, location) =>
        set((state) => ({
          panes: {
            ...state.panes,
            [paneId]: { ...state.panes[paneId], location },
          },
        })),
      enterWithTarget: (target, location) => {
        const normalizedTarget = normalizeZenModeTarget(target);
        if (!normalizedTarget) return false;
        set({
          panes: {
            [ZEN_PRIMARY_PANE_ID]: DEFAULT_PANES[ZEN_PRIMARY_PANE_ID],
            [ZEN_SECONDARY_PANE_ID]: {
              paneId: ZEN_SECONDARY_PANE_ID,
              target: normalizedTarget,
              location: location ?? DEFAULT_PANES[ZEN_SECONDARY_PANE_ID].location,
            },
          },
          activePaneId: ZEN_SECONDARY_PANE_ID,
        });
        return true;
      },
      clearPane: (paneId) =>
        set((state) => ({
          panes: { ...state.panes, [paneId]: DEFAULT_PANES[paneId] },
        })),
      setActivePane: (paneId) => set({ activePaneId: paneId }),
      setPrimaryPanePercentage: (percentage) =>
        set({ primaryPanePercentage: clamp(percentage, 25, 75) }),
      setChatWidth: (width) => set({ chatWidth: clampZenChatPanelWidth(width) }),
    }),
    {
      name: 'zen-mode',
      storage: createStoreJSONStorage('tab'),
      partialize: (state) => ({
        panes: state.panes,
        activePaneId: state.activePaneId,
        primaryPanePercentage: state.primaryPanePercentage,
        chatWidth: state.chatWidth,
      }),
    }
  )
);

const resetZenModeStore = (): void => {
  useZenModeStore.setState(DEFAULT_ZEN_MODE_STATE);
};

registerStore({
  id: 'layout.zen-mode',
  scope: 'tab',
  reset: resetZenModeStore,
});
