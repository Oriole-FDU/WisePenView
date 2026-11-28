import type { TagPermissionResourceStrategy } from '@/components/business/Drive/_common/tagPermissionPreset';
import type { ResourceAction } from '@/domains/_shared/access';
import type { TagPermissionPresetKey } from '@/domains/Tag';

export type ActionPresetKey = Exclude<TagPermissionPresetKey, 'custom'>;

export interface TagPermissionActionEditorProps {
  ariaLabel: string;
  actions: ResourceAction[];
  isDisabled?: boolean;
  labels: {
    actionHeader: string;
    applicable: (strategy: TagPermissionResourceStrategy) => string;
    basedOnPreset: string;
    currentPreset: (preset: string) => string;
    customPreset: string;
    disabled: (strategy: TagPermissionResourceStrategy, action: string) => string;
    enabled: (strategy: TagPermissionResourceStrategy, action: string) => string;
    getActionLabel: (action: ResourceAction) => string;
    getPresetLabel: (preset: ActionPresetKey) => string;
    toggleHeader: string;
  };
  onActionsChange: (actions: ResourceAction[]) => void;
}
