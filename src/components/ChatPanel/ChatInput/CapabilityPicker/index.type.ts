import type { SkillSummary } from '@/domains';
import type { ChatAgentOption, TemporarySkillSelection } from '@/store';
import type { CapabilityToolOption } from '../capability';

export interface CapabilityPickerProps {
  open: boolean;
  advancedMode: boolean;
  primarySkills: SkillSummary[];
  selectedSkills: TemporarySkillSelection[];
  selectedTools: CapabilityToolOption[];
  toolOptions: CapabilityToolOption[];
  onToggleSkill: (skill: SkillSummary) => void;
  onToggleTool: (tool: CapabilityToolOption) => void;
  onRemoveExternalSkill: (skillId: string) => void;
  onOpenOtherSkillModal: () => void;
  currentAgent: ChatAgentOption | null;
  otherSkillGroups: Array<{ key: string }>;
  onMenuInteract?: () => void;
}
