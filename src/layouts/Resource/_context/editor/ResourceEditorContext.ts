import { createContext } from 'react';

import type { createEditorHost } from '@/components/editors/_runtime/editorHost';
import type { Editor, EditorExitReason } from '@/components/editors/editor.type';

export interface ResourceEditorContextValue {
  host: ReturnType<typeof createEditorHost>;
  registerEditor(editor: Editor): () => void;
  requestExit(reason: EditorExitReason): Promise<boolean>;
}
export const ResourceEditorContext = createContext<ResourceEditorContextValue | null>(null);
