import type { SkillScopeTreeGroup } from '@/components/ChatPanel/skillScope';
import type { SkillSummary } from '@/domains';
import type { ChatAgentOption, TemporarySkillSelection } from '@/store';

export interface OtherSkillModalProps {
  open: boolean;
  groups: SkillScopeTreeGroup[];
  currentAgent: ChatAgentOption | null;
  selectedSkills: TemporarySkillSelection[];
  onClose: () => void;
  onConfirm: (
    selected: Array<{ skill: SkillSummary; sourceAgent: ChatAgentOption | null }>
  ) => void;
}
