import type { AgentAsset, AgentSpec } from '@/domains/Agent';
import type { ChatModel, ToolOption } from '@/domains/ChatConfig';
import type { SkillSummary } from '@/domains/Skill';

import type { AgentDraft } from '../../_common/model';

export interface AgentEditorProps {
  assets: AgentAsset[];
  draft: AgentDraft;
  draftVersion: number;
  models: ChatModel[];
  readOnly: boolean;
  resourceId: string;
  skills: SkillSummary[];
  tools: ToolOption[];
  onDescriptionChange: (description: string) => void;
  onNameChange: (name: string) => void;
  onSpecChange: (spec: AgentSpec) => void;
  onSystemPromptChange: (systemPrompt: string) => void;
}
