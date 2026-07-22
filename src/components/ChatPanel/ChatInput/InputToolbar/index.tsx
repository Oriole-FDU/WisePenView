import { Button } from '@heroui/react';
import clsx from 'clsx';
import { ArrowUp, Square } from 'lucide-react';
import AgentPicker from '../AgentPicker';
import ModelPicker from '../ModelPicker';
import SkillMenu from '../SkillMenu';
import styles from '../style.module.less';
import UploadMenu from '../UploadMenu';
import VoiceInput from '../VoiceInput';
import type { InputToolbarProps } from './index.type';

function InputToolbar({
  sendDisabled,
  sending,
  voiceInputProps,
  injectedAgents,
  preferredAgent,
  modelIconOnly = false,
  onSend,
  onStop,
}: InputToolbarProps) {
  function handlePrimaryAction(): void {
    if (sending) {
      onStop?.();
      return;
    }
    onSend();
  }

  return (
    <div className={styles.actionToolbar}>
      <div className={styles.toolbarLeft}>
        <UploadMenu />
        <AgentPicker injectedAgents={injectedAgents} preferredAgent={preferredAgent} />
        <SkillMenu />
      </div>

      <div className={styles.toolsRight}>
        <div
          className={clsx(
            styles.modelSelectorShell,
            modelIconOnly && styles.modelSelectorShellIcon
          )}
        >
          <ModelPicker iconOnly={modelIconOnly} />
        </div>
        <VoiceInput {...voiceInputProps} />
        <Button
          variant={sending ? 'ghost' : 'primary'}
          size="sm"
          isIconOnly
          onPress={handlePrimaryAction}
          isDisabled={sending ? !onStop : sendDisabled}
          className={clsx(styles.toolbarCircleBtn, sending && styles.stopButtonActive)}
          aria-label={sending ? '停止生成' : '发送消息'}
        >
          {sending ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}
        </Button>
      </div>
    </div>
  );
}

export default InputToolbar;
