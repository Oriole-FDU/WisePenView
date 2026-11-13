import { useMemoizedFn, useUnmount } from 'ahooks';
import { useRef, useState } from 'react';

export type DebouncedSaveStatus = 'idle' | 'scheduled' | 'saving' | 'failed';

interface UseDebouncedSaveOptions<TValue> {
  save: (value: TValue) => Promise<void>;
  canSave?: () => boolean;
  delayMs?: number;
  maxWaitMs?: number;
  onError?: (error: unknown, value: TValue) => void;
  onSuccess?: (value: TValue) => void;
}

interface UseDebouncedSaveResult<TValue> {
  cancel: () => void;
  flush: () => Promise<void>;
  retry: () => Promise<void>;
  schedule: (value: TValue) => void;
  status: DebouncedSaveStatus;
}

interface PendingSave<TValue> {
  revision: number;
  value: TValue;
}

/**
 * 调度可延迟保存，并保证同一时间只有一个保存请求。
 *
 * 保存期间产生的新值会保留为尾随任务；当前请求完成后继续保存最新快照。
 * 调用方应传入不可变快照，避免保存过程中继续读取到后续修改。
 */
export function useDebouncedSave<TValue>({
  save,
  canSave,
  delayMs = 800,
  maxWaitMs = 5000,
  onError,
  onSuccess,
}: UseDebouncedSaveOptions<TValue>): UseDebouncedSaveResult<TValue> {
  const [status, setStatus] = useState<DebouncedSaveStatus>('idle');
  const pendingRef = useRef<PendingSave<TValue> | null>(null);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const firstPendingAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);

  const clearTimer = useMemoizedFn(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  });

  const saveLatest = useMemoizedFn(async () => {
    while (true) {
      const pending = pendingRef.current;
      if (!pending || pending.revision <= savedRevisionRef.current) break;
      if (canSave && !canSave()) return;

      clearTimer();
      setStatus('saving');
      try {
        await save(pending.value);
        savedRevisionRef.current = pending.revision;
        if (pendingRef.current?.revision === pending.revision) {
          pendingRef.current = null;
        }
        onSuccess?.(pending.value);
      } catch (error) {
        setStatus('failed');
        onError?.(error, pending.value);
        throw error;
      }
    }

    firstPendingAtRef.current = null;
    setStatus(pendingRef.current ? 'scheduled' : 'idle');
  });

  const flush = useMemoizedFn(() => {
    clearTimer();
    if (!flushPromiseRef.current) {
      flushPromiseRef.current = saveLatest().finally(() => {
        flushPromiseRef.current = null;
      });
    }
    return flushPromiseRef.current;
  });

  const schedule = useMemoizedFn((value: TValue) => {
    if (canSave && !canSave()) return;

    clearTimer();
    revisionRef.current += 1;
    pendingRef.current = {
      revision: revisionRef.current,
      value,
    };
    const now = Date.now();
    firstPendingAtRef.current ??= now;
    setStatus('scheduled');

    const elapsed = now - firstPendingAtRef.current;
    const waitMs = Math.max(0, Math.min(delayMs, maxWaitMs - elapsed));
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flush().catch(() => undefined);
    }, waitMs);
  });

  const retry = useMemoizedFn(() => flush());

  const cancel = useMemoizedFn(() => {
    clearTimer();
    pendingRef.current = null;
    firstPendingAtRef.current = null;
    if (!flushPromiseRef.current) setStatus('idle');
  });

  useUnmount(() => {
    clearTimer();
  });

  return {
    cancel,
    flush,
    retry,
    schedule,
    status,
  };
}
