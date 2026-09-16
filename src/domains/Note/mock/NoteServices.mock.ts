import type {
  CreateNoteRequest,
  CreateNoteResponse,
  ForkNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '@/domains/Note';
import { createMockResourcePermissionOverview } from '@/domains/Resource/mock/resourcePermissionOverview.mockdata';
import { useResourceDisplayNameStore } from '@/domains/Resource/store/useResourceDisplayNameStore';

import { NOTE_AI_DIFF_PREVIEW_MOCK } from './aiDiffPreview.mockdata';

const text = (value: string) => ({
  type: 'text' as const,
  text: value,
  styles: {},
});

const COURSE_NOTE_MOCKS: Record<
  string,
  Pick<NoteInfoDisplayData, 'noteTitle' | 'aiDiffPreview'>
> = {
  'mock-note-1': {
    noteTitle: '课程导学',
    aiDiffPreview: {
      content: [
        {
          id: 'course-intro-heading',
          type: 'heading',
          props: { level: 2, isToggleable: false },
          content: [text('这门课程如何学习')],
          children: [],
        },
        {
          id: 'course-intro-body',
          type: 'paragraph',
          props: {},
          content: [
            text(
              '从数据结构的抽象定义出发，结合代码实现、复杂度分析与练习，逐步建立问题建模能力。'
            ),
          ],
          children: [],
        },
        {
          id: 'course-intro-list',
          type: 'bulletListItem',
          props: {},
          content: [text('完成章节资源后，可在课程主页查看整体学习进度。')],
          children: [],
        },
      ],
    },
  },
  'mock-note-2': {
    noteTitle: '顺序表与链表笔记',
    aiDiffPreview: {
      content: [
        {
          id: 'linear-list-heading',
          type: 'heading',
          props: { level: 2, isToggleable: false },
          content: [text('线性表的两种基本实现')],
          children: [],
        },
        {
          id: 'linear-list-array',
          type: 'paragraph',
          props: {},
          content: [
            text('顺序表使用连续存储空间，支持常数时间的随机访问，但中间插入和删除需要移动元素。'),
          ],
          children: [],
        },
        {
          id: 'linear-list-linked',
          type: 'paragraph',
          props: {},
          content: [
            text('链表通过指针连接节点，插入和删除更灵活，但访问第 k 个元素需要顺序遍历。'),
          ],
          children: [],
        },
      ],
    },
  },
};

/** Mock 占位：与实现层一致，同步更新展示名 store */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { resourceId: '123' };
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const courseNote = COURSE_NOTE_MOCKS[params.resourceId];
  return {
    noteTitle: courseNote?.noteTitle ?? 'AI Diff 样式预览',
    authors: [],
    lastEditedAtText: '暂无',
    version: 0,
    canCollaborativeEdit: true,
    aiDiffPreview: courseNote?.aiDiffPreview ?? NOTE_AI_DIFF_PREVIEW_MOCK,
  };
};

const getDrawIoLatestSnapshot = async () => ({
  resourceId: '123',
  version: 0,
  fullSnapshot: null,
  deltas: null,
});

const saveDrawIoSnapshot = async (_params: SaveDrawIoSnapshotRequest): Promise<void> => {
  return Promise.resolve();
};

const forkNote = async (_params: ForkNoteRequest) => {
  return { resourceId: '124' };
};

const listNoteVersions = async () => ({
  list: [],
  total: 0,
  page: 1,
  size: 20,
  totalPage: 0,
});

export const NoteServicesMock: INoteService = {
  getNotePermissionOverview: async (resourceId) =>
    createMockResourcePermissionOverview({ resourceId, resourceType: 'note' }),
  syncTitle,
  createNote,
  getNoteInfoDisplay,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
};
