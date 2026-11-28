import type { AgentSpec } from '@/domains/Agent';
import type { ChatModel } from '@/domains/ChatConfig';

export interface Props {
  spec: AgentSpec;
  models: ChatModel[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}
