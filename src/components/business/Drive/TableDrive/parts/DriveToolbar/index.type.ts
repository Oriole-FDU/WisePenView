import type { CreateMenuItem } from '../CreateMenu/index.type';

export interface DriveToolbarProps {
  showCreateMenu: boolean;
  createMenuItems: CreateMenuItem[];
  onSelectCreate: (id: CreateMenuItem['id']) => void;
  showUploadToGroup: boolean;
  onOpenUploadToGroup: () => void;
  detailPanelCollapsed: boolean;
  onToggleDetailPanel: () => void;
}
