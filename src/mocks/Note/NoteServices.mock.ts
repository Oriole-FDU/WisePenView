import type {
  INoteService,
  SyncNoteResponse,
  LoadNoteResponse,
  CreateNoteResponse,
  DuplicateNoteRequest,
  DuplicateNoteResponse,
} from '@/services/Note';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 预设的两个 mock note 的 doc_id，loadNote 会按 id 返回不同内容 */
export const MOCK_NOTE_IDS = ['mock-note-1', 'mock-note-2'] as const;

const MOCK_NOTE_1: Omit<LoadNoteResponse, 'doc_id'> = {
  ok: true,
  version: 1,
  blocks: [
    {
      id: 'mock-block-1',
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: '', styles: {} }],
      children: [],
    },
  ],
  updated_at: new Date().toISOString(),
};

const MOCK_NOTE_2: Omit<LoadNoteResponse, 'doc_id'> = {
  ok: true,
  version: 1,
  blocks: [
    {
      id: 'mock-block-2',
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: '第二份 Mock 笔记', styles: {} }],
      children: [],
    },
  ],
  updated_at: new Date().toISOString(),
};

const syncNote = async (): Promise<SyncNoteResponse> => {
  await delay(200);
  return { new_version: Date.now() };
};

const loadNote = async (docId: string): Promise<LoadNoteResponse> => {
  await delay(300);
  const base = docId === MOCK_NOTE_IDS[1] ? MOCK_NOTE_2 : MOCK_NOTE_1;
  return { ...base, doc_id: docId };
};

const createNote = async (): Promise<CreateNoteResponse> => {
  await delay(200);
  const docId = `mock-doc-${Date.now()}`;
  return {
    ok: true,
    doc_id: docId,
    version: 1,
    blocks: [],
    created_at: new Date().toISOString(),
  };
};

const duplicateNote = async (params: DuplicateNoteRequest): Promise<DuplicateNoteResponse> => {
  await delay(200);
  const docId = `mock-doc-copy-${params.source}-${Date.now()}`;
  return {
    ok: true,
    doc_id: docId,
    version: 1,
    blocks: [],
    created_at: new Date().toISOString(),
  };
};

export const NoteServicesMock: INoteService = {
  syncNote,
  loadNote,
  createNote,
  duplicateNote,
};
