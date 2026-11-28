export type UnsavedSkillChangesMode = 'publish' | 'leave' | 'switchVersion' | 'cancelEditing';

export interface UnsavedSkillChangesModalProps {
  isOpen: boolean;
  mode: UnsavedSkillChangesMode;
  isLoading?: boolean;
  onCancel: () => void;
  onDiscard?: () => void;
  onConfirm: () => void;
}
