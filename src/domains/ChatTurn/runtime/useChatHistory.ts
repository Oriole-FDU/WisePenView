import { useLatest } from 'ahooks';
import { useRef, useState } from 'react';

import type { PageResult } from '@/domains/_shared/entity/page';
import type { WisePenUIMessage } from '@/domains/ChatSession';

import type { ChatMessageLoadingActions } from './control/useChatMessageControl';

export interface UseChatHistoryOptions {
  sessionId: string | null;
  pageSize: number;
  loadPage: (
    sessionId: string,
    page: number,
    size: number
  ) => Promise<PageResult<WisePenUIMessage>>;
  setMessages: (
    messages: WisePenUIMessage[] | ((messages: WisePenUIMessage[]) => WisePenUIMessage[])
  ) => void;
  loading: ChatMessageLoadingActions;
}

export interface UseChatHistoryResult {
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

export function useChatHistory({
  sessionId,
  pageSize,
  loadPage,
  setMessages,
  loading,
}: UseChatHistoryOptions): UseChatHistoryResult {
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
      const payload = await loadPage(targetSessionId, 1, pageSize);
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
      const payload = await loadPage(targetSessionId, nextPage, pageSize);
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
