import type { VoiceInputProps } from '../VoiceInput';

export interface InputToolbarProps {
  sendDisabled: boolean;
  sending: boolean;
  voiceInputProps: VoiceInputProps;
  onSend: () => void;
  onStop?: () => void;
}
