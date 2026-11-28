export type CapabilityPolicyKind = 'tool' | 'skill';

export interface CapabilityPolicyOption {
  id: string;
  name: string;
  internalName?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface Props {
  kind: CapabilityPolicyKind;
  title: string;
  description: string;
  addLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  selectedEmptyText: string;
  options: CapabilityPolicyOption[];
  selectedIds: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}
