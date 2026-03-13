import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { SyncPayload } from '@/types/note';
import type {
  INoteService,
  SyncNoteResponse,
  LoadNoteResponse,
  CreateNoteRequest,
  CreateNoteResponse,
} from './index.type';

/**
 * 增量保存：将一批编辑变更（Delta）提交到服务端
 * POST /api/v1/note/{docId}/sync
 */
const syncNote = async (docId: string, payload: SyncPayload): Promise<SyncNoteResponse> => {
  const res = (await Axios.post(`/note/${docId}/sync`, payload)) as ApiResponse<SyncNoteResponse>;
  checkResponse(res);
  return res.data;
};

/**
 * 全量加载：获取文档的完整内容（Block 树）
 * GET /api/v1/note/{docId}
 */
const loadNote = async (docId: string): Promise<LoadNoteResponse> => {
  const res = (await Axios.get(`/note/${docId}`)) as ApiResponse<LoadNoteResponse>;
  checkResponse(res);
  return res.data;
};

/**
 * 新建文档：创建新文档，可传入初始内容
 * POST /api/v1/note/create
 */
const createNote = async (params?: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const res = (await Axios.post('/note/create', params ?? {})) as ApiResponse<CreateNoteResponse>;
  checkResponse(res);
  return res.data;
};

export const NoteServicesImpl: INoteService = {
  syncNote,
  loadNote,
  createNote,
};
