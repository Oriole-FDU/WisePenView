import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useWorkspacePanelPortalContext } from './_context';
import type { WorkspacePanelId } from './workspacePanelModel';

/** 将内容保留在原业务子树中，同时渲染到唯一右栏的命名槽位。 */
export function WorkspacePanelPortal({
  panelId,
  children,
}: {
  panelId: WorkspacePanelId;
  children: ReactNode;
}) {
  const { roots } = useWorkspacePanelPortalContext();
  const root = roots.get(panelId);
  return root ? createPortal(children, root) : null;
}
