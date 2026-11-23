import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';
import { GuideAnchor } from '@/components/base/Guide';
import { TextArea } from '@/components/base/Input';
import { GUIDE_TOOL_ID } from '@/constants/tour';
import { useAppAuth } from '@/layouts/App/_context';

import { ChatInputFileProvider, ChatInputStoreProvider, useChatInputStoreApi } from './_context';
import AttachmentStrip from './AttachmentStrip';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import type { ChatInputHandle, ChatInputProps } from './index.type';
import InputToolbar from './InputToolbar';
import OtherSkillModal from './OtherSkillModal';
import styles from './style.module.scss';
import { useChatInputController } from './useChatInputController';
import { useChatInputGuideActions } from './useChatInputGuideActions';
import { useCompactModelTrigger } from './useCompactModelTrigger';

function ChatInputContent({
  onSend,
  onCancel,
  sending,
  contextPreview,
  onClearContext,
  injectedAgents,
  preferredAgent,
  fullWidth,
  handleRef,
}: Omit<ChatInputProps, 'getUploadSessionId' | 'sessionId' | 'promoteDraftToolSelection'>) {
  const { t } = useTranslation('chat');
  const { isAuthenticated } = useAppAuth();
  const inputCardRef = useRef<HTMLDivElement>(null);
  const store = useChatInputStoreApi();
  const { containerProps, isDragOver, textAreaProps, toolbarProps } = useChatInputController({
    onSend,
    onCancel,
    sending,
  });
  const modelIconOnly = useCompactModelTrigger(fullWidth, inputCardRef);
  useChatInputGuideActions(store);

  useImperativeHandle(
    handleRef,
    (): ChatInputHandle => ({
      setValue: (value) => store.getState().setValue(value),
    }),
    [store]
  );

  return (
    <div
      className={styles.container}
      data-model-trigger={modelIconOnly ? 'icon' : 'default'}
      {...containerProps}
    >
      <GuideAnchor id={GUIDE_TOOL_ID.chatComposer} asChild>
        <div
          ref={inputCardRef}
          className={clsx(styles.inputCard, isDragOver && styles.inputCardDragOver)}
        >
          <AttachmentStrip />

          {contextPreview ? (
            <div className={styles.contextAttachment}>
              <span className={styles.contextAttachmentPreview}>{contextPreview}</span>
              <AppPressable
                type="button"
                className={styles.contextAttachmentClear}
                aria-label={t('input.removeContext')}
                onClick={() => onClearContext?.()}
              >
                <X size={14} aria-hidden="true" />
              </AppPressable>
            </div>
          ) : null}

          <TextArea
            {...textAreaProps}
            placeholder={t('input.placeholder')}
            rows={1}
            className={styles.textarea}
          />

          <InputToolbar
            {...toolbarProps}
            injectedAgents={injectedAgents}
            preferredAgent={preferredAgent}
            modelIconOnly={modelIconOnly}
          />

          <DropOverlay visible={isDragOver} />
        </div>
      </GuideAnchor>

      {isAuthenticated ? <OtherSkillModal /> : null}

      {isAuthenticated ? <DocumentPickerModal /> : null}

      <div className={styles.footerTip}>{t('input.disclaimer')}</div>
    </div>
  );
}

/** 输入区自持 store；旁路预填走 `handleRef.setValue`，不抬升 Provider。 */
function ChatInput({
  handleRef,
  getUploadSessionId,
  sessionId,
  promoteDraftToolSelection,
  ...props
}: ChatInputProps) {
  return (
    <ChatInputStoreProvider
      sessionId={sessionId}
      promoteDraftToolSelection={promoteDraftToolSelection}
    >
      <ChatInputFileProvider getUploadSessionId={getUploadSessionId}>
        <ChatInputContent {...props} handleRef={handleRef} />
      </ChatInputFileProvider>
    </ChatInputStoreProvider>
  );
}

export default ChatInput;
export type { ChatInputHandle } from './index.type';
