import type {
  INoteService,
  SyncTitleRequest,
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  NoteInfoDisplayData,
} from '@/services/Note';

/** Mock 占位：与实现层一致，无模拟数据逻辑 */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { resourceId: '123' };
};

const deleteNote = async (_params: DeleteNoteRequest): Promise<void> => {
  return Promise.resolve();
};

const getNoteInfoDisplay = async (_params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  return {
    authors: [],
    lastEditedAtText: '暂无',
  };
};

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
};
