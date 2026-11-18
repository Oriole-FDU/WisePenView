import type { UseChatHistoryDataOptions, UseChatHistoryDataResult } from './useChatHistoryData';
import { useChatHistoryData } from './useChatHistoryData';

export type UseChatDataOptions = UseChatHistoryDataOptions;

export interface UseChatDataResult {
  history: UseChatHistoryDataResult;
}

/**
 * Data：历史分页与会话消息写入；loading 门禁仍由 control.message 提供。
 */
export function useChatData(options: UseChatDataOptions): UseChatDataResult {
  const history = useChatHistoryData(options);
  return { history };
}
