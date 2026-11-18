import { useLatest } from 'ahooks';
import { useRef, useState } from 'react';

import { useChatTurnService } from '@/domains';

import type { WisePenUIMessage } from '../../entity/message';
import type { ChatMessagesWriter } from '../message/useChatMessage';
import type { HistoryLoadingActions } from './useHistoryLoadingFsm';

const DEFAULT_HISTORY_PAGE_SIZE = 100;

export interface UseHistoryDataOptions {
  sessionId: string | null;
  setMessages: ChatMessagesWriter;
  loading: HistoryLoadingActions;
}

export interface UseHistoryDataResult {
  canLoadMore: boolean;
  replaceHistory: (targetSessionId: string) => Promise<boolean>;
  prependHistory: () => Promise<void>;
  clearConversation: () => void;
}

function mergeMessages(
  olderMessages: readonly WisePenUIMessage[],
  newerMessages: readonly WisePenUIMessage[]
): WisePenUIMessage[] {
  const seenIds = new Set<string>();
  return [...olderMessages, ...newerMessages].filter((message) => {
    if (seenIds.has(message.id)) return false;
    seenIds.add(message.id);
    return true;
  });
}

export function useHistoryData({
  sessionId,
  setMessages,
  loading,
}: UseHistoryDataOptions): UseHistoryDataResult {
  const { listHistoryMessages } = useChatTurnService();
  const sessionIdRef = useLatest(sessionId);
  const loadingRef = useLatest(loading);
  const requestVersionRef = useRef(0);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  const clearConversation = () => {
    requestVersionRef.current += 1;
    loadingRef.current.resetLoading();
    setPage(1);
    setTotalPage(1);
    setMessages([]);
  };

  const replaceHistory = async (targetSessionId: string): Promise<boolean> => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    loadingRef.current.beginReplaceLoad();
    setPage(1);
    setTotalPage(1);
    setMessages([]);

    try {
      const payload = await listHistoryMessages(targetSessionId, 1, DEFAULT_HISTORY_PAGE_SIZE);
      if (
        requestVersion !== requestVersionRef.current ||
        targetSessionId !== sessionIdRef.current
      ) {
        return false;
      }
      setMessages((currentMessages) => mergeMessages(payload.list, currentMessages));
      setPage(payload.page ?? 1);
      setTotalPage(payload.totalPage ?? 1);
      return true;
    } catch (error) {
      if (
        requestVersion !== requestVersionRef.current ||
        targetSessionId !== sessionIdRef.current
      ) {
        return false;
      }
      throw error;
    } finally {
      if (
        requestVersion === requestVersionRef.current &&
        targetSessionId === sessionIdRef.current
      ) {
        loadingRef.current.endReplaceLoad();
      }
    }
  };

  const prependHistory = async (): Promise<void> => {
    const targetSessionId = sessionIdRef.current;
    if (!targetSessionId || page >= totalPage) return;
    if (!loadingRef.current.beginPrependLoad()) return;

    const requestVersion = requestVersionRef.current;
    const nextPage = page + 1;

    try {
      const payload = await listHistoryMessages(
        targetSessionId,
        nextPage,
        DEFAULT_HISTORY_PAGE_SIZE
      );
      if (
        requestVersion !== requestVersionRef.current ||
        targetSessionId !== sessionIdRef.current
      ) {
        return;
      }
      setMessages((currentMessages) => mergeMessages(payload.list, currentMessages));
      setPage(payload.page ?? nextPage);
      setTotalPage(payload.totalPage ?? totalPage);
    } finally {
      if (
        requestVersion === requestVersionRef.current &&
        targetSessionId === sessionIdRef.current
      ) {
        loadingRef.current.endPrependLoad();
      }
    }
  };

  return {
    canLoadMore: Boolean(sessionId) && page < totalPage,
    replaceHistory,
    prependHistory,
    clearConversation,
  };
}
