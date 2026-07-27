import { FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH } from '@/constants/layoutScale';
import { TextArea } from '@heroui/react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  fullWidth,
}: ChatInputProps) {
  const { t } = useTranslation('chat');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const [measuredCompactModelTrigger, setMeasuredCompactModelTrigger] = useState(false);
  const { containerProps, isDragOver, textAreaProps, toolbarProps } = useChatInputController({
    onSend,
    onStop,
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

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 先压到 0 再读 scrollHeight，避免沿用错误的大高度
    textarea.style.height = '0px';
    const contentHeight = textarea.scrollHeight;
    const computedMax = window.getComputedStyle(textarea).maxHeight;
    const parsedMax = Number.parseFloat(computedMax);
    // calc(...) 时 parseFloat 为 NaN；侧栏与 fullWidth 共用同一回退上限
    const maxHeightPx = Number.isFinite(parsedMax) ? parsedMax : 16 * 16 + 16;
    const minHeightPx = Number.parseFloat(window.getComputedStyle(textarea).minHeight);
    const floor = Number.isFinite(minHeightPx) ? minHeightPx : 0;
    const nextHeight = Math.min(Math.max(contentHeight, floor), maxHeightPx);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = contentHeight > nextHeight ? 'auto' : 'hidden';
  }, [textAreaProps.value]);

  const modelIconOnly = !fullWidth || measuredCompactModelTrigger;

  return (
    <div
      className={styles.container}
      data-model-trigger={modelIconOnly ? 'icon' : 'default'}
      {...containerProps}
    >
      <div
        ref={inputCardRef}
        className={clsx(styles.inputCard, isDragOver && styles.inputCardDragOver)}
      >
        <AttachmentStrip />

        {contextPreview ? (
          <div className={styles.contextAttachment}>
            <span className={styles.contextAttachmentPreview}>{contextPreview}</span>
            <button
              type="button"
              className={styles.contextAttachmentClear}
              aria-label={t('input.removeContext')}
              onClick={onClearContext}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <TextArea
          {...textAreaProps}
          ref={textareaRef}
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

      <OtherSkillModal />

      <DocumentPickerModal />

      <div className={styles.footerTip}>{t('input.disclaimer')}</div>
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
