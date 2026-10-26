import type { ReactNode } from 'react';

import type { WorkspacePanelId, WorkspacePanelSlot } from './workspacePanelModel';

export interface WorkspaceRightPanelLayoutProps {
  main: ReactNode;
  panelSlots: readonly WorkspacePanelSlot[];
  activePanelId: WorkspacePanelId | null;
  panelWidths: Record<WorkspacePanelId, number>;
  mainMinWidth: number;
  panelGroupId?: string;
  className?: string;
  resizeLabel: string;
  onPanelResize: (panelId: WorkspacePanelId, width: number) => void;
}
