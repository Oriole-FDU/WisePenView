import AppIconButton from '@/components/Button/AppIconButton';
import { LoaderCircle, Mic, Square } from 'lucide-react';
import styles from '../style.module.less';
import type { VoiceInputProps } from './index.type';

const STATE_LABELS: Record<VoiceInputProps['state'], string> = {
  idle: '语音输入',
  requestingPermission: '正在请求麦克风权限',
  issuingCredential: '正在准备语音识别',
  connecting: '正在连接语音识别',
  listening: '停止语音输入',
  finishing: '正在结束语音输入',
};

function VoiceInput({ state, isActive, isDisabled, onPress }: VoiceInputProps) {
  const label = STATE_LABELS[state];
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
export type { VoiceInputProps, VoiceInputState } from './index.type';
