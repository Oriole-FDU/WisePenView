import AppIconButton from '@/components/Button/AppIconButton';
import { TextArea } from '@heroui/react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
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
  onStop,
  sending,
  contextPreview,
  onClearContext,
  injectedAgents,
  preferredAgent,
  fullWidth = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { attachmentStripProps, containerProps, dropOverlayProps, textAreaProps, toolbarProps } =
    useChatInputController({
      onSend,
      onStop,
      sending,
    });

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = Number.parseFloat(window.getComputedStyle(textarea).maxHeight);
    const nextHeight = Number.isFinite(maxHeight)
      ? Math.min(textarea.scrollHeight, maxHeight)
      : textarea.scrollHeight;
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > nextHeight ? 'auto' : 'hidden';
  }, [textAreaProps.value]);

  return (
    <div className={styles.container} {...containerProps}>
      <div className={clsx(styles.inputCard, dropOverlayProps.visible && styles.inputCardDragOver)}>
        <AttachmentStrip {...attachmentStripProps} />

        {contextPreview ? (
          <div className={styles.contextAttachment}>
            <span className={styles.contextAttachmentPreview}>{contextPreview}</span>
            <AppIconButton
              icon={<X size={14} aria-hidden="true" />}
              label="移除上下文"
              size="sm"
              className={styles.contextAttachmentClear}
              onPress={onClearContext}
            />
          </div>
        ) : null}

        <TextArea
          {...textAreaProps}
          ref={textareaRef}
          placeholder="输入消息..."
          rows={1}
          className={styles.textarea}
        />

        <InputToolbar
          {...toolbarProps}
          injectedAgents={injectedAgents}
          preferredAgent={preferredAgent}
          modelIconOnly={!fullWidth}
        />

        <DropOverlay {...dropOverlayProps} />
      </div>

      <OtherSkillModal />

      <DocumentPickerModal />

      <div className={styles.footerTip}>AI 内容仅供参考，请仔细甄别</div>
    </div>
  );
}

function ChatInput(props: ChatInputProps) {
  return (
    <ChatInputStoreProvider>
      <ChatInputFileProvider getUploadSessionId={props.getUploadSessionId}>
        <ChatInputContent {...props} />
      </ChatInputFileProvider>
    </ChatInputStoreProvider>
  );
}

export default ChatInput;
