import type { ChatAgentOption, ChatInputCapabilityOptions } from '@/domains/Chat';

import type { VoiceInputProps } from '../VoiceInput';

export interface InputToolbarProps {
  capabilityOptions?: ChatInputCapabilityOptions;
  capabilityOptionsLoading: boolean;
  sendDisabled: boolean;
  sending: boolean;
  voiceInputProps: VoiceInputProps;
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  /** 侧栏窄宽时模型选择仅显示图标 */
  modelIconOnly: boolean;
  isAuthenticated: boolean;
  onRequireLogin?: () => void;
  onSend: () => void;
  onCancel?: () => void | Promise<void>;
}
