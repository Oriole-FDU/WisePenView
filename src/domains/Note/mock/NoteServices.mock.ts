import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SyncTitleRequest,
} from '@/domains/Note';

/** Mock 占位：与实现层一致，无模拟数据逻辑 */
const syncTitle = async (_params: SyncTitleRequest): Promise<void> => {
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
    noteTitle: '未命名笔记',
    authors: [],
    lastEditedAtText: '暂无',
    readCount: 12,
  };
};

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
};
