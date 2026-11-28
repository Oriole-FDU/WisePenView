import type { AgentSpec } from '@/domains/Agent';

export interface Props {
  spec: AgentSpec;
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}
