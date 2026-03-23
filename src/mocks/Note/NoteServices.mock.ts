import type { INoteService, SyncTitleRequest } from '@/services/Note';

/** Mock 占位：与实现层一致，无模拟数据逻辑 */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  return Promise.resolve();
};

export const NoteServicesMock: INoteService = {
  syncTitle,
};
