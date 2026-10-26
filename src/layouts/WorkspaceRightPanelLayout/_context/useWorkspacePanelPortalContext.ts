import { useRequiredContext } from '@/hooks/useRequiredContext';

import { WorkspacePanelPortalContext } from './WorkspacePanelPortalContext';

export function useWorkspacePanelPortalContext() {
  return useRequiredContext(WorkspacePanelPortalContext, 'WorkspacePanelPortalProvider');
}
