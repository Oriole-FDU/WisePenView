import { ArrowUp, Bot, Mic, Plus, Settings, SlidersHorizontal, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { cn } from '@/utils/cn';

import AgentPicker from '../AgentPicker';
import ModelPicker from '../ModelPicker';
import SkillMenu from '../SkillMenu';
import styles from '../style.module.less';
import UploadMenu from '../UploadMenu';
import VoiceInput from '../VoiceInput';
import type { InputToolbarProps } from './index.type';

function InputToolbar({
  capabilityOptions,
  capabilityOptionsLoading,
  sendDisabled,
  sending,
  voiceInputProps,
  injectedAgents,
  preferredAgent,
  modelIconOnly,
  isAuthenticated,
  onRequireLogin,
  onSend,
  onCancel,
}: InputToolbarProps) {
  const { t } = useTranslation('chat');
  function handlePrimaryAction(): void {
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    if (sending) {
      void onCancel?.();
      return;
    }
    onSend();
  }

  return (
    <div className={styles.actionToolbar}>
      <div className={styles.toolbarLeft}>
        {isAuthenticated ? (
          <>
            <UploadMenu />
            <AgentPicker injectedAgents={injectedAgents} preferredAgent={preferredAgent} />
            <SkillMenu options={capabilityOptions} loading={capabilityOptionsLoading} />
          </>
        ) : (
          <>
            <AppIconButton
              icon={<Plus size={18} aria-hidden="true" />}
              label={t('input.uploadMenu.trigger')}
              onPress={onRequireLogin}
            />
            <AppIconButton
              icon={<Bot size={17} aria-hidden="true" />}
              label={t('input.agentPicker.trigger')}
              onPress={onRequireLogin}
            />
            <AppIconButton
              icon={<Settings size={17} aria-hidden="true" />}
              label={t('input.skillMenu.configure')}
              onPress={onRequireLogin}
            />
          </>
        )}
      </div>

      <div className={styles.toolsRight}>
        <div
          className={cn(styles.modelSelectorShell, modelIconOnly && styles.modelSelectorShellIcon)}
        >
          {isAuthenticated ? (
            <ModelPicker iconOnly={modelIconOnly} />
          ) : (
            <AppIconButton
              icon={<SlidersHorizontal size={17} aria-hidden="true" />}
              label={t('modelSelector.select')}
              onPress={onRequireLogin}
            />
          )}
        </div>
        {isAuthenticated ? (
          <VoiceInput {...voiceInputProps} />
        ) : (
          <AppIconButton
            icon={<Mic size={17} aria-hidden="true" />}
            label={t('input.voice.idle')}
            onPress={onRequireLogin}
          />
        )}
        <AppIconButton
          icon={
            sending ? (
              <Square size={14} fill="currentColor" aria-hidden="true" />
            ) : (
              <ArrowUp size={18} aria-hidden="true" />
            )
          }
          label={sending ? t('input.stop') : t('input.send')}
          variant={sending ? 'ghost' : 'primary'}
          onPress={handlePrimaryAction}
          isDisabled={sending ? !onCancel : sendDisabled}
          className={sending ? styles.stopButtonActive : undefined}
        />
      </div>
    </div>
  );
}

export default InputToolbar;
