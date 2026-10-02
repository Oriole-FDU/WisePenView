import { createContext } from 'react';

import type { Editor, EditorExitReason } from '@/components/editors/editor.type';
import type { createEditorHost } from '@/components/editors/runtime/editorHost';

export interface ResourceEditorContextValue {
  host: ReturnType<typeof createEditorHost>;
  registerEditor(editor: Editor): () => void;
  requestExit(reason: EditorExitReason): Promise<boolean>;
}
export const ResourceEditorContext = createContext<ResourceEditorContextValue | null>(null);
