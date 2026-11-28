import type { AgentSpec } from '@/domains/Agent';

export interface Props {
  name: string;
  description: string;
  spec: AgentSpec;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSpecChange: (spec: AgentSpec) => void;
}
