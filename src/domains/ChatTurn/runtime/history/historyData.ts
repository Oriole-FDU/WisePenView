/**
 * 固定 session 的历史分页：replace / prepend / clear（无跨 session 陈旧防护）。
 */
import type { WisePenUIMessage } from '../../entity/message';
import type { IChatTurnService } from '../../service/index.type';
import type { ChatMessagesWriter } from '../message/chatMessage';
import type { HistoryLoadingFsm } from './historyLoadingFsm';

const DEFAULT_HISTORY_PAGE_SIZE = 100;

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

export interface HistoryDataOptions {
  sessionId: string;
  service: IChatTurnService;
  setMessages: ChatMessagesWriter;
  loading: HistoryLoadingFsm;
  onChange?: () => void;
}

export class HistoryData {
  private page = 1;
  private totalPage = 1;
  private requestVersion = 0;
  private readonly sessionId: string;
  private readonly service: IChatTurnService;
  private readonly setMessages: ChatMessagesWriter;
  private readonly loading: HistoryLoadingFsm;
  private readonly onChange?: () => void;

  constructor(options: HistoryDataOptions) {
    this.sessionId = options.sessionId;
    this.service = options.service;
    this.setMessages = options.setMessages;
    this.loading = options.loading;
    this.onChange = options.onChange;
  }

  get canLoadMore(): boolean {
    return this.page < this.totalPage;
  }

  clearConversation(): void {
    this.requestVersion += 1;
    this.loading.resetLoading();
    this.page = 1;
    this.totalPage = 1;
    this.setMessages([]);
    this.onChange?.();
  }

  async replaceHistory(): Promise<boolean> {
    const requestVersion = this.requestVersion + 1;
    this.requestVersion = requestVersion;
    this.loading.beginReplaceLoad();
    this.page = 1;
    this.totalPage = 1;
    this.setMessages([]);
    this.onChange?.();

    try {
      const payload = await this.service.listHistoryMessages(
        this.sessionId,
        1,
        DEFAULT_HISTORY_PAGE_SIZE
      );
      if (requestVersion !== this.requestVersion) return false;
      this.setMessages((current) => mergeMessages(payload.list, current));
      this.page = payload.page ?? 1;
      this.totalPage = payload.totalPage ?? 1;
      this.onChange?.();
      return true;
    } catch (error) {
      if (requestVersion !== this.requestVersion) return false;
      throw error;
    } finally {
      if (requestVersion === this.requestVersion) {
        this.loading.endReplaceLoad();
        this.onChange?.();
      }
    }
  }

  async prependHistory(): Promise<void> {
    if (this.page >= this.totalPage) return;
    if (!this.loading.beginPrependLoad()) return;
    this.onChange?.();

    const requestVersion = this.requestVersion;
    const nextPage = this.page + 1;

    try {
      const payload = await this.service.listHistoryMessages(
        this.sessionId,
        nextPage,
        DEFAULT_HISTORY_PAGE_SIZE
      );
      if (requestVersion !== this.requestVersion) return;
      this.setMessages((current) => mergeMessages(payload.list, current));
      this.page = payload.page ?? nextPage;
      this.totalPage = payload.totalPage ?? this.totalPage;
      this.onChange?.();
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      throw error;
    } finally {
      if (requestVersion === this.requestVersion) {
        this.loading.endPrependLoad();
        this.onChange?.();
      }
    }
  }

  dispose(): void {
    this.requestVersion += 1;
    this.loading.resetLoading();
  }
}
