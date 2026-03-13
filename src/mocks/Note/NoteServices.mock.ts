import type {
  INoteService,
  SyncNoteResponse,
  LoadNoteResponse,
  CreateNoteResponse,
} from '@/services/Note';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const syncNote = async (): Promise<SyncNoteResponse> => {
  await delay(200);
  return { new_version: Date.now() };
};

const loadNote = async (docId: string): Promise<LoadNoteResponse> => {
  await delay(300);
  return {
    ok: true,
    doc_id: docId,
    version: 1,
    blocks: [
      {
        id: 'mock-block-1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Mock content', styles: {} }],
        children: [],
      },
    ],
    updated_at: new Date().toISOString(),
  };
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

export const NoteServicesMock: INoteService = {
  syncNote,
  loadNote,
  createNote,
};
