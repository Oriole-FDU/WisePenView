import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SyncTitleRequest,
} from '@/domains/Note';
import { useResourceDisplayNameStore } from '@/store';

/** Mock 占位：与实现层一致，同步更新展示名 store */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
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
    canCollaborativeEdit: true,
    commentsEnabled: true,
    canEditComments: true,
    authorsById: {},
  };
};

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
  getNotePermissionConfig: async () => ({
    resourceId: '123',
    overrideGrantedActions: null,
    specifiedUsersGrantedActions: null,
  }),
};
