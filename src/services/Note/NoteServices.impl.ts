import type {
  INoteService,
  SyncTitleRequest,
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  NoteInfoDisplayData,
} from './index.type';
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { NoteInfoResponse } from '@/types/note';
import type { UserDisplayBase } from '@/types/user';

const getAuthorName = (author: UserDisplayBase): string => {
  return author.nickname || author.realName || '未知用户';
};

const formatLastEditedAt = (value?: string): string => {
  if (!value) return '暂无';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// syncTitle是一个resource的工作，但是语义上属于note服务
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  const { resourceId, newName } = params;
  const res = (await Axios.post('/resource/item/renameRes', {
    resourceId,
    newName,
  })) as ApiResponse;
  checkResponse(res);
};

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const res = (await Axios.post('/addNote', params)) as ApiResponse<string>;
  checkResponse(res);
  return {
    resourceId: res.data || undefined,
  };
};

const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
  const res = (await Axios.post('/removeNote', null, { params })) as ApiResponse;
  checkResponse(res);
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const res = (await Axios.get('/getNoteInfo', { params })) as ApiResponse<NoteInfoResponse>;
  checkResponse(res);
  const noteInfoData = res.data;
  const allAuthors = noteInfoData.noteInfo.authors ?? [];
  return {
    authors: allAuthors.map((author) => ({
      name: getAuthorName(author),
      avatar: author.avatar,
    })),
    lastEditedAtText: formatLastEditedAt(noteInfoData.noteInfo.lastUpdatedAt),
  };
};

export const NoteServicesImpl: INoteService = {
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
};
