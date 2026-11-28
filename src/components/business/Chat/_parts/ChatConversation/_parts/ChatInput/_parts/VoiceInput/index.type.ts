export type VoiceInputState =
  'idle' | 'requestingPermission' | 'issuingCredential' | 'connecting' | 'listening' | 'finishing';

export interface VoiceInputProps {
  state: VoiceInputState;
  isActive: boolean;
  isDisabled: boolean;
  onPress: () => void;
}
