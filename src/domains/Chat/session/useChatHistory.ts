import { useLatest } from 'ahooks';
import { useRef, useState } from 'react';
import type { WisePenUIMessage } from '../entity/message';
import type { PageResult } from '../service/index.type';

interface UseChatHistoryOptions {
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
}: UseChatHistoryOptions) {
  const sessionIdRef = useLatest(sessionId);
  const requestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const clearConversation = () => {
    requestVersionRef.current += 1;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setPage(1);
    setTotalPage(1);
    setMessages([]);
  };

  const replaceHistory = async (targetSessionId: string): Promise<void> => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setPage(1);
    setTotalPage(1);
    setMessages([]);

    try {
      const payload = await loadPage(targetSessionId, 1, pageSize);
      if (
        requestVersion !== requestVersionRef.current ||
        targetSessionId !== sessionIdRef.current
      ) {
        return;
      }
      setMessages((currentMessages) => mergeMessages(payload.list, currentMessages));
      setPage(payload.page ?? 1);
      setTotalPage(payload.totalPage ?? 1);
    } catch (error) {
      if (
        requestVersion !== requestVersionRef.current ||
        targetSessionId !== sessionIdRef.current
      ) {
        return;
      }
      throw error;
    }
  };

  const prependHistory = async (): Promise<void> => {
    const targetSessionId = sessionIdRef.current;
    if (!targetSessionId || loadingMoreRef.current || page >= totalPage) return;

    const requestVersion = requestVersionRef.current;
    const nextPage = page + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);

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
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  return {
    canLoadMore: Boolean(sessionId) && page < totalPage,
    loadingMore,
    replaceHistory,
    prependHistory,
    clearConversation,
  };
}
