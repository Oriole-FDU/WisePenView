import type { NoteInfoResponse } from '@/domains/Note';
import { useNewNoteStore, useNoteSelectionStore, usePdfPreviewProgressStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeResourceItem } from '@/utils/normalize/normalizeResourceItem';
import { NoteApi } from '../apis/NoteApi';
import { ResourceItemApi } from '../apis/ResourceApi';
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SyncTitleRequest,
} from './index.type';

// syncTitle是一个resource的工作，但是语义上属于note服务
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  const { resourceId, newName } = params;
  await ResourceItemApi.renameResource({
    resourceId,
    newName,
  });
};

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(params);
  return {
    resourceId: resourceId || undefined,
  };
};

const deleteNote = async (params: DeleteNoteRequest): Promise<void> => {
  await ResourceItemApi.removeResources({ resourceIds: params.resourceIds });
  for (const resourceId of params.resourceIds) {
    // 资源已删除，同步清理与之绑定的临时状态
    usePdfPreviewProgressStore.getState().removeProgress(resourceId);
    useNewNoteStore.getState().clearNewNoteResourceId(resourceId);
    useNoteSelectionStore.getState().clearSelectedText(resourceId);
  }
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = (await NoteApi.getNoteInfo(params)) as NoteInfoResponse;
  if (!noteInfoData?.resourceInfo || !noteInfoData?.noteInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  // readCount/likeCount 后端以字符串返回（Java Long），归一化为 number
  const resourceInfo = normalizeResourceItem(noteInfoData.resourceInfo);
  const authorIds = noteInfoData.noteInfo.authors ?? [];
  return {
    noteTitle: resourceInfo.resourceName,
    authors: authorIds.map((authorId) => {
      const author = noteInfoData.authorsDisplay?.[authorId];
      return {
        name: author?.nickname || author?.realName || '未知用户',
        avatar: author?.avatar,
      };
    }),
    lastEditedAtText: formatTimestampToDateTime(noteInfoData.noteInfo.lastUpdatedAt) || '暂无',
    readCount: resourceInfo.readCount ?? null,
    likeCount: resourceInfo.likeCount ?? null,
    scoreAvg: resourceInfo.scoreAvg ?? null,
    liked: resourceInfo.liked ?? false,
    userScore: resourceInfo.userScore ?? null,
  };
};

export const createNoteServices = (): INoteService => ({
  syncTitle,
  createNote,
  deleteNote,
  getNoteInfoDisplay,
});
