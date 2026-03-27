import type {
  INoteService,
  SyncTitleRequest,
  CreateNoteRequest,
  CreateNoteResponse,
} from '@/services/Note';

/** Mock 占位：与实现层一致，无模拟数据逻辑 */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { ok: false };
};

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
};
