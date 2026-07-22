import type { ChatAgentOption } from '@/domains/Chat';
import type { VoiceInputProps } from '../VoiceInput';

export interface InputToolbarProps {
  sendDisabled: boolean;
  sending: boolean;
  voiceInputProps: VoiceInputProps;
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  /** 侧栏窄宽时模型选择仅显示图标 */
  modelIconOnly?: boolean;
  onSend: () => void;
  onStop?: () => void;
}
