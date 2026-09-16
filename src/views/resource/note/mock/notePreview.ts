import type { NoteInfoDisplayData } from '@/domains/Note';
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

export const getNotePreview = (resourceId: string) =>
  COURSE_NOTE_MOCKS[resourceId]?.aiDiffPreview ?? NOTE_AI_DIFF_PREVIEW_MOCK;
