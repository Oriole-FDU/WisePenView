import type { ChatAgentOption } from '@/domains/ChatConfig';
import type { ResourceSkillSummary } from '@/domains/Resource';

export interface SkillSelectionOption {
  skill: ResourceSkillSummary;
  sourceAgent: ChatAgentOption | null;
}
