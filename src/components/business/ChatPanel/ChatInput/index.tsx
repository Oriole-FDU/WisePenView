import { TextArea } from '@heroui/react';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH } from '@/constants/layoutScale';
import { cn } from '@/utils/cn';

import { ChatInputStoreProvider } from './_store/ChatInputStoreProvider';
import AttachmentStrip from './AttachmentStrip';
import { ChatInputFileProvider } from './ChatInputFileContext';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import type { ChatInputProps } from './index.type';
import InputToolbar from './InputToolbar';
import OtherSkillModal from './OtherSkillModal';
import styles from './style.module.less';
import { useChatInputController } from './useChatInputController';

function ChatInputContent({
  onSend,
  onCancel,
  sending,
  contextPreview,
  onClearContext,
  injectedAgents,
  preferredAgent,
  fullWidth,
  isAuthenticated = true,
  onRequireLogin,
}: ChatInputProps) {
  const { t } = useTranslation('chat');
  const inputCardRef = useRef<HTMLDivElement>(null);
  const [measuredCompactModelTrigger, setMeasuredCompactModelTrigger] = useState(false);
  const { containerProps, isDragOver, textAreaProps, toolbarProps } = useChatInputController({
    onSend,
    onCancel,
    onRequireLogin,
    isAuthenticated,
    sending,
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：fullWidth 挂载后，以及输入卡片尺寸变化时。
   * 不可替代原因：模型按钮是否展示文案取决于输入区实宽，无法仅靠 fullWidth 判断。
   * cleanup：断开 ResizeObserver，并取消尚未执行的首帧测量。
   */
  useEffect(() => {
    const syncCompactModelTrigger = (width: number) => {
      setMeasuredCompactModelTrigger(width < FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH);
    };

    if (!fullWidth) return;

    const inputCard = inputCardRef.current;
    if (!inputCard || typeof ResizeObserver === 'undefined') {
      const frame = window.requestAnimationFrame(() => {
        syncCompactModelTrigger(inputCard?.getBoundingClientRect().width ?? window.innerWidth);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      syncCompactModelTrigger(entry.contentRect.width);
    });
    observer.observe(inputCard);
    return () => observer.disconnect();
  }, [fullWidth]);

  const modelIconOnly = !fullWidth || measuredCompactModelTrigger;

  return (
    <div
      className={styles.container}
      data-model-trigger={modelIconOnly ? 'icon' : 'default'}
      {...containerProps}
    >
      <div
        ref={inputCardRef}
        className={cn(styles.inputCard, isDragOver && styles.inputCardDragOver)}
      >
        <AttachmentStrip />

        {contextPreview ? (
          <div className={styles.contextAttachment}>
            <span className={styles.contextAttachmentPreview}>{contextPreview}</span>
            <button
              type="button"
              className={styles.contextAttachmentClear}
              aria-label={t('input.removeContext')}
              onClick={() => onClearContext?.()}
            >
              <X size={14} aria-hidden="true" />
            </button>
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

      {isAuthenticated ? <OtherSkillModal /> : null}

      {isAuthenticated ? <DocumentPickerModal /> : null}

      <div className={styles.footerTip}>{t('input.disclaimer')}</div>
    </div>
  );
}

function ChatInput(props: ChatInputProps) {
  return (
    <ChatInputStoreProvider
      sessionId={props.sessionId}
      promoteDraftToolSelection={props.promoteDraftToolSelection}
    >
      <ChatInputFileProvider getUploadSessionId={props.getUploadSessionId}>
        <ChatInputContent {...props} />
      </ChatInputFileProvider>
    </ChatInputStoreProvider>
  );
}

export default ChatInput;
