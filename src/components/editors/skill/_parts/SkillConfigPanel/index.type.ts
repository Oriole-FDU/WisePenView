export interface SkillConfigPanelProps {
  name: string;
  description: string;
  canEdit: boolean;
  isDirty: boolean;
  isLoading: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
}
