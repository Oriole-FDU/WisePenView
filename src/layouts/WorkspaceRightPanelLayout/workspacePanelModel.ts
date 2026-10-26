import {
  CHAT_PANEL_MAX_WIDTH,
  CHAT_PANEL_MIN_WIDTH,
  clampChatPanelWidth,
  clampWorkspaceContextPanelWidth,
  WORKSPACE_CONTEXT_PANEL_MAX_WIDTH,
  WORKSPACE_CONTEXT_PANEL_MIN_WIDTH,
} from '@/constants/layoutScale';

export const WORKSPACE_PANEL_IDS = ['inlineComment', 'interact', 'chat'] as const;

export type WorkspacePanelId = (typeof WORKSPACE_PANEL_IDS)[number];

export const getWorkspacePanelTargetId = (panelId: WorkspacePanelId): string =>
  `workspace-right-panel-${panelId}`;

export const getWorkspacePanelSlotLabelId = (panelId: WorkspacePanelId): string =>
  `workspace-right-panel-label-${panelId}`;

export interface WorkspacePanelWidthBounds {
  minWidth: number;
  maxWidth: number;
}

export interface WorkspacePanelSlot extends WorkspacePanelWidthBounds {
  id: WorkspacePanelId;
  ariaLabel: string;
}

export const WORKSPACE_PANEL_SLOT_WIDTH_BOUNDS: Record<
  WorkspacePanelId,
  WorkspacePanelWidthBounds
> = {
  chat: {
    minWidth: CHAT_PANEL_MIN_WIDTH,
    maxWidth: CHAT_PANEL_MAX_WIDTH,
  },
  inlineComment: {
    minWidth: WORKSPACE_CONTEXT_PANEL_MIN_WIDTH,
    maxWidth: WORKSPACE_CONTEXT_PANEL_MAX_WIDTH,
  },
  interact: {
    minWidth: WORKSPACE_CONTEXT_PANEL_MIN_WIDTH,
    maxWidth: WORKSPACE_CONTEXT_PANEL_MAX_WIDTH,
  },
};

export function createWorkspacePanelSlots(
  labels: Record<WorkspacePanelId, string>
): WorkspacePanelSlot[] {
  return WORKSPACE_PANEL_IDS.map((panelId) => ({
    id: panelId,
    ariaLabel: labels[panelId],
    ...WORKSPACE_PANEL_SLOT_WIDTH_BOUNDS[panelId],
  }));
}

export function clampWorkspacePanelWidth(panelId: WorkspacePanelId, width: number): number {
  return panelId === 'chat' ? clampChatPanelWidth(width) : clampWorkspaceContextPanelWidth(width);
}
