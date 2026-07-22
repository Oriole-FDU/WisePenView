import { useMessageScroller, useMessageScrollerVisibility } from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';
import { useUnmount, useUpdateEffect } from 'ahooks';
import { isTextUIPart } from 'ai';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import styles from './style.module.less';

const PREVIEW_LENGTH = 28;
const OPEN_DELAY_MS = 160;
const CLOSE_DELAY_MS = 280;

interface MessageHistoryNavigatorProps {
  messages: WisePenUIMessage[];
}

interface UserMessageAnchor {
  id: string;
  preview: string;
}

function getMessagePreview(message: WisePenUIMessage, maxLength: number): string {
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('')
    .replaceAll(/\s+/g, ' ')
    .trim();

  if (!text) {
    return message.metadata?.selectedAttachments?.length ? '附件消息' : '空消息';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function useUserMessageAnchors(messages: WisePenUIMessage[]) {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => ({
      id: message.id,
      preview: getMessagePreview(message, PREVIEW_LENGTH),
    }));
}

/** 持续跟随 MessageScroller 的 scroll-spy（user 消息带 scrollAnchor） */
function useActiveHistoryAnchorId(anchors: UserMessageAnchor[]) {
  const { currentAnchorId } = useMessageScrollerVisibility();
  if (!currentAnchorId) return null;
  return anchors.some((anchor) => anchor.id === currentAnchorId) ? currentAnchorId : null;
}

function HistoryBar({ active }: { active: boolean }) {
  return (
    <span
      className={styles.historyNavigatorBar}
      data-active={active ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}

function scrollActiveItemIntoView(panel: HTMLDivElement | null, activeAnchorId: string | null) {
  if (!panel || !activeAnchorId) return;
  const activeItem = panel.querySelector<HTMLElement>(
    `[data-anchor-id="${CSS.escape(activeAnchorId)}"]`
  );
  activeItem?.scrollIntoView({ block: 'nearest' });
}

/** 右侧垂直居中横条轨；hover / 点击展开文案浮层 */
function MessageHistoryNavigator({ messages }: MessageHistoryNavigatorProps) {
  const anchors = useUserMessageAnchors(messages);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scrollToMessage } = useMessageScroller();
  const activeAnchorId = useActiveHistoryAnchorId(anchors);

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const handleJumpToMessage = (messageId: string) => {
    scrollToMessage(messageId, { behavior: 'smooth', align: 'start' });
    setOpen(false);
  };

  useUnmount(() => {
    clearTimers();
  });

  useUpdateEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useUpdateEffect(() => {
    if (!open) return;
    scrollActiveItemIntoView(panelRef.current, activeAnchorId);
  }, [open, activeAnchorId]);

  if (anchors.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={clsx(
        styles.historyNavigator,
        styles.historyNavigatorRail,
        open && styles.historyNavigatorRailOpen
      )}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocusCapture={scheduleOpen}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        className={styles.historyNavigatorRailTrigger}
        aria-label="历史提问"
        aria-expanded={open}
        aria-controls="chat-history-navigator-panel"
        onClick={() => {
          clearTimers();
          setOpen((prev) => !prev);
        }}
      >
        {anchors.map((anchor) => (
          <HistoryBar key={anchor.id} active={anchor.id === activeAnchorId} />
        ))}
      </button>

      <div
        ref={panelRef}
        id="chat-history-navigator-panel"
        className={styles.historyNavigatorRailPanel}
        role="listbox"
        aria-label="历史提问"
        hidden={!open}
      >
        {anchors.map((anchor) => {
          const isActive = anchor.id === activeAnchorId;
          return (
            <button
              key={anchor.id}
              type="button"
              role="option"
              data-anchor-id={anchor.id}
              aria-selected={isActive}
              className={styles.historyNavigatorRailItem}
              data-active={isActive ? 'true' : 'false'}
              title={anchor.preview}
              onClick={() => handleJumpToMessage(anchor.id)}
            >
              <span className={styles.historyNavigatorRailPreview}>{anchor.preview}</span>
              <HistoryBar active={isActive} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MessageHistoryNavigator;
