import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GuideAnchor, registerGuideActionHandlers } from '@/components/base/Guide';
import { TextArea } from '@/components/base/Input';
import { FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH } from '@/constants/layoutScale';
import { GUIDE_ACTION_ID, GUIDE_TOOL_ID } from '@/constants/tour';
import { useAppAuth } from '@/layouts/App/_context';

import { ChatInputFileProvider, ChatInputStoreProvider, useChatInputStoreApi } from './_context';
import AttachmentStrip from './AttachmentStrip';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import type { ChatInputProps } from './index.type';
import InputToolbar from './InputToolbar';
import OtherSkillModal from './OtherSkillModal';
import styles from './style.module.scss';
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
}: ChatInputProps) {
  const { t } = useTranslation('chat');
  const { isAuthenticated } = useAppAuth();
  const inputCardRef = useRef<HTMLDivElement>(null);
  const [measuredCompactModelTrigger, setMeasuredCompactModelTrigger] = useState(false);
  const store = useChatInputStoreApi();
  const { containerProps, isDragOver, textAreaProps, toolbarProps } = useChatInputController({
    onSend,
    onCancel,
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

  /**
   * @wisepen-manual-effect
   * 执行时机：输入区挂载时注册引导动作，卸载时撤销。
   * 不可替代原因：引导层需要直接调用输入区 store 的 setter 展开抽屉，不能依赖 DOM 点击。
   * cleanup：撤销四个动作处理器，避免指向已卸载的输入区。
   */
  useEffect(() => {
    const openOnly = (open: (state: ReturnType<typeof store.getState>) => void): void => {
      const state = store.getState();
      state.setModelOpen(false);
      state.setAttachmentOpen(false);
      state.setAgentOpen(false);
      state.setSkillMenuOpen(false);
      open(state);
    };
    return registerGuideActionHandlers({
      [GUIDE_ACTION_ID.openModelMenu]: {
        isOpen: () => store.getState().modelOpen,
        open: () => openOnly((state) => state.setModelOpen(true)),
        close: () => store.getState().setModelOpen(false),
      },
      [GUIDE_ACTION_ID.openUploadMenu]: {
        isOpen: () => store.getState().attachmentOpen,
        open: () => openOnly((state) => state.setAttachmentOpen(true)),
        close: () => store.getState().setAttachmentOpen(false),
      },
      [GUIDE_ACTION_ID.openAgentMenu]: {
        isOpen: () => store.getState().agentOpen,
        open: () => openOnly((state) => state.setAgentOpen(true)),
        close: () => store.getState().setAgentOpen(false),
      },
      [GUIDE_ACTION_ID.openSkillMenu]: {
        isOpen: () => store.getState().skillMenuOpen,
        open: () => openOnly((state) => state.setSkillMenuOpen(true)),
        close: () => store.getState().setSkillMenuOpen(false),
      },
    });
  }, [store]);

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
      </GuideAnchor>

      {isAuthenticated ? <OtherSkillModal /> : null}

      {isAuthenticated ? <DocumentPickerModal /> : null}

      <div className={styles.footerTip}>{t('input.disclaimer')}</div>
    </div>
  );
}

function ChatInput({ useExternalStore = false, ...props }: ChatInputProps) {
  const content = (
    <ChatInputFileProvider getUploadSessionId={props.getUploadSessionId}>
      <ChatInputContent {...props} />
    </ChatInputFileProvider>
  );

  if (useExternalStore) {
    return content;
  }

  return (
    <ChatInputStoreProvider
      sessionId={props.sessionId}
      promoteDraftToolSelection={props.promoteDraftToolSelection}
    >
      {content}
    </ChatInputStoreProvider>
  );
}

export default ChatInput;
