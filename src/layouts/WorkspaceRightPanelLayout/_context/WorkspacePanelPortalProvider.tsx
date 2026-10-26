import { useMemoizedFn } from 'ahooks';
import { type ReactNode, useState } from 'react';

import type { WorkspacePanelId } from '../workspacePanelModel';
import {
  WorkspacePanelPortalContext,
  type WorkspacePanelPortalContextValue,
} from './WorkspacePanelPortalContext';

export function WorkspacePanelPortalProvider({ children }: { children: ReactNode }) {
  const [roots, setRoots] = useState<Map<WorkspacePanelId, HTMLElement>>(() => new Map());
  const registerRoot = useMemoizedFn((panelId: WorkspacePanelId, root: HTMLElement | null) => {
    setRoots((current) => {
      const existing = current.get(panelId);
      if (existing === root || (existing == null && root == null)) return current;

      const next = new Map(current);
      if (root) next.set(panelId, root);
      else next.delete(panelId);
      return next;
    });
  });
  const value: WorkspacePanelPortalContextValue = { roots, registerRoot };

  return (
    <WorkspacePanelPortalContext.Provider value={value}>
      {children}
    </WorkspacePanelPortalContext.Provider>
  );
}
