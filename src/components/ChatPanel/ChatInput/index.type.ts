import type { Model } from '@/components/ChatPanel/index.type';
import type { SkillScopeTreeGroup } from '@/components/ChatPanel/skillScope';
import type { SkillSummary } from '@/domains';
import type { ChatAgentOption } from '@/store';

export interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  sending: boolean;
  currentModelId: string;
  onModelChange: (model: Model) => void;
  hasSelectedContext: boolean;
  selectedContextText: string;
  onClearSelectedContext: () => void;
  selectedAgent: ChatAgentOption | null;
  primarySkills: SkillSummary[];
  advancedMode: boolean;
  advancedSkillGroups: SkillScopeTreeGroup[];
}
