import { createContext } from 'react';

import type { WorkspacePanelId } from '../workspacePanelModel';

export interface WorkspacePanelPortalContextValue {
  roots: ReadonlyMap<WorkspacePanelId, HTMLElement>;
  registerRoot: (panelId: WorkspacePanelId, root: HTMLElement | null) => void;
}

export const WorkspacePanelPortalContext = createContext<WorkspacePanelPortalContextValue | null>(
  null
);
