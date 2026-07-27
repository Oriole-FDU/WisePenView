import AppIconButton from '@/components/Button/AppIconButton';
import { LoaderCircle, Mic, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';
import type { VoiceInputProps } from './index.type';

const STATE_LABEL_KEYS: Record<VoiceInputProps['state'], string> = {
  idle: 'input.voice.idle',
  requestingPermission: 'input.voice.requestingPermission',
  issuingCredential: 'input.voice.issuingCredential',
  connecting: 'input.voice.connecting',
  listening: 'input.voice.listening',
  finishing: 'input.voice.finishing',
};

function VoiceInput({ state, isActive, isDisabled, onPress }: VoiceInputProps) {
  const { t } = useTranslation('chat');
  const label = t(STATE_LABEL_KEYS[state]);
  const isLoading =
    state === 'requestingPermission' ||
    state === 'issuingCredential' ||
    state === 'connecting' ||
    state === 'finishing';

  return (
    <AppIconButton
      icon={
        isLoading ? (
          <LoaderCircle size={17} className={styles.spinIcon} aria-hidden="true" />
        ) : state === 'listening' ? (
          <Square size={14} fill="currentColor" aria-hidden="true" />
        ) : (
          <Mic size={18} aria-hidden="true" />
        )
      }
      label={label}
      isDisabled={isDisabled}
      isActive={isActive}
      variant={isActive ? 'danger' : 'ghost'}
      onPress={onPress}
    />
  );
}

export default VoiceInput;
export type { VoiceInputProps } from './index.type';
