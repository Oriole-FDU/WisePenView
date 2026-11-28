import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/ChatConfig';
import type { SkillSummary } from '@/domains/Skill';

export interface Props {
  spec: AgentSpec;
  tools: ToolOption[];
  skills: SkillSummary[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}
