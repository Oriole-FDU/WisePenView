import type { VersionDropdownItem } from '@/components/business/VersionDropdown/index.type';

export interface AgentHeaderActionsProps {
  disabledVersionKeys: Set<string>;
  isDirty: boolean;
  publishLoading: boolean;
  saveLoading: boolean;
  versionItems: VersionDropdownItem[];
  versionLoading: boolean;
  viewingVersion: number | null;
  onPublish: () => void;
  onSave: () => void;
  onVersionSelect: (version: number) => void;
}
