import { TextArea } from '@heroui/react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useRef } from 'react';
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
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { attachmentStripProps, containerProps, dropOverlayProps, textAreaProps, toolbarProps } =
    useChatInputController({
      onSend,
      onStop,
      sending,
    });

  return (
    <div className={styles.container} {...containerProps}>
      <div className={clsx(styles.inputCard, dropOverlayProps.visible && styles.inputCardDragOver)}>
        <AttachmentStrip {...attachmentStripProps} />

        {contextPreview ? (
          <div className={styles.contextAttachment}>
            <span className={styles.contextAttachmentPreview}>{contextPreview}</span>
            <button
              type="button"
              className={styles.contextAttachmentClear}
              aria-label="移除上下文"
              onClick={onClearContext}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <TextArea
          {...textAreaProps}
          ref={textareaRef}
          placeholder="输入消息..."
          rows={1}
          className={styles.textarea}
        />

        <InputToolbar {...toolbarProps} />

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
