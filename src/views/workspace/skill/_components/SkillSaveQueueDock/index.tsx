import type { TFunction } from 'i18next';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  SkillSaveQueueDockProps,
  SkillSaveQueueItem,
  SkillSaveQueuePhase,
} from './index.type';
import styles from './style.module.less';

type QueueMode = 'idle' | 'pending' | 'saving' | 'failed';

const DEFAULT_QUEUE_BODY_HEIGHT = 168;
const MIN_QUEUE_BODY_HEIGHT = 88;
const MAX_QUEUE_BODY_HEIGHT = 360;

function isActivePhase(phase: SkillSaveQueuePhase): boolean {
  return phase === 'preparing' || phase === 'uploading';
}

function clampHeight(value: number): number {
  return Math.min(MAX_QUEUE_BODY_HEIGHT, Math.max(MIN_QUEUE_BODY_HEIGHT, value));
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveQueueMode(items: SkillSaveQueueItem[]): QueueMode {
  if (items.length === 0) return 'idle';
  if (items.some((item) => item.phase === 'failed')) return 'failed';
  if (items.some((item) => isActivePhase(item.phase))) return 'saving';
  return 'pending';
}

function resolveQueueTitle(
  mode: QueueMode,
  items: SkillSaveQueueItem[],
  t: TFunction<'skill'>
): string {
  if (mode === 'idle') return t('queue.title');
  if (mode === 'failed') {
    const failedCount = items.filter((item) => item.phase === 'failed').length;
    return t('queue.failedTitle', { count: failedCount });
  }
  if (mode === 'saving') {
    const doneCount = items.filter((item) => item.phase === 'done').length;
    return t('queue.savingTitle', { done: doneCount, total: items.length });
  }
  return t('queue.pendingTitle', { count: items.length });
}

function resolveQueueHint(mode: QueueMode, t: TFunction<'skill'>): string {
  if (mode === 'idle') return t('queue.idleHint');
  if (mode === 'failed') return t('queue.failedHint');
  if (mode === 'saving') return t('queue.savingHint');
  return t('queue.pendingHint');
}

function resolveQueueProgress(items: SkillSaveQueueItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + clampProgress(item.progress), 0);
  return clampProgress(total / items.length);
}

function resolvePhaseText(item: SkillSaveQueueItem, t: TFunction<'skill'>): string {
  if (item.phase === 'pending') return t('queue.phase.pending');
  if (item.phase === 'preparing') return t('queue.phase.preparing');
  if (item.phase === 'uploading') return `${clampProgress(item.progress)}%`;
  if (item.phase === 'done') return t('queue.phase.done');
  return item.errorMessage ?? t('queue.phase.failed');
}

function QueuePhaseIcon({ item }: { item: SkillSaveQueueItem }) {
  if (item.phase === 'done') return <CheckCircle2 size={13} />;
  if (item.phase === 'failed') return <AlertCircle size={13} />;
  if (isActivePhase(item.phase)) return <LoaderCircle className={styles.spinningIcon} size={13} />;
  return <Clock3 size={13} />;
}

function SkillSaveQueueDock({ items, onRetry }: SkillSaveQueueDockProps) {
  const { t } = useTranslation('skill');
  const [expanded, setExpanded] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(DEFAULT_QUEUE_BODY_HEIGHT);
  const resizeStateRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
  } | null>(null);
  const mode = resolveQueueMode(items);
  const progress = resolveQueueProgress(items);
  const canRetry = mode === 'failed' && Boolean(onRetry);

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    setExpanded(true);
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: bodyHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    setBodyHeight(clampHeight(resizeState.startHeight + resizeState.startY - event.clientY));
  };

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    resizeStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 12;
    if (event.key === 'ArrowUp') {
      setExpanded(true);
      setBodyHeight((height) => clampHeight(height + step));
      event.preventDefault();
    }
    if (event.key === 'ArrowDown') {
      setExpanded(true);
      setBodyHeight((height) => clampHeight(height - step));
      event.preventDefault();
    }
    if (event.key === 'Home') {
      setExpanded(true);
      setBodyHeight(MIN_QUEUE_BODY_HEIGHT);
      event.preventDefault();
    }
    if (event.key === 'End') {
      setExpanded(true);
      setBodyHeight(MAX_QUEUE_BODY_HEIGHT);
      event.preventDefault();
    }
  };

  return (
    <section
      className={`${styles.queueDock} ${expanded ? styles.queueDockExpanded : ''}`}
      aria-live="polite"
    >
      <div
        className={styles.resizeHandle}
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('queue.resize')}
        aria-valuemin={MIN_QUEUE_BODY_HEIGHT}
        aria-valuemax={MAX_QUEUE_BODY_HEIGHT}
        aria-valuenow={bodyHeight}
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onLostPointerCapture={() => {
          resizeStateRef.current = null;
        }}
        onKeyDown={handleResizeKeyDown}
      />
      <div className={styles.queueHeader}>
        <button
          type="button"
          className={styles.queueToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronRight
            className={`${styles.chevronIcon} ${expanded ? styles.chevronIconExpanded : ''}`}
            size={15}
            aria-hidden="true"
          />
          <span className={styles.queueTitle}>
            <strong>{resolveQueueTitle(mode, items, t)}</strong>
            <span>{resolveQueueHint(mode, t)}</span>
          </span>
        </button>
        <span className={styles.queueMeta}>
          {mode === 'saving' ? `${progress}%` : null}
          {canRetry ? (
            <button type="button" className={styles.retryButton} onClick={() => onRetry?.()}>
              <RefreshCw size={12} />
              <span>{t('queue.retry')}</span>
            </button>
          ) : null}
        </span>
      </div>

      {mode === 'saving' || mode === 'failed' ? (
        <div className={styles.progressTrack} aria-hidden="true">
          <span className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {expanded ? (
        <div className={styles.queueBody} style={{ height: bodyHeight }}>
          {items.length === 0 ? (
            <div className={styles.emptyItem}>{t('queue.empty')}</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className={styles.queueItem}>
                <span
                  className={`${styles.itemIcon} ${
                    item.phase === 'failed' ? styles.itemIconFailed : ''
                  }`}
                  aria-hidden="true"
                >
                  <QueuePhaseIcon item={item} />
                </span>
                <span className={styles.itemText}>
                  <strong title={item.name}>{item.name}</strong>
                  <small title={item.path}>{item.path}</small>
                </span>
                <span
                  className={`${styles.itemPhase} ${
                    item.phase === 'failed' ? styles.itemPhaseFailed : ''
                  }`}
                  title={resolvePhaseText(item, t)}
                >
                  {resolvePhaseText(item, t)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

export default SkillSaveQueueDock;
