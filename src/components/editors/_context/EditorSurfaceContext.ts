import { createContext } from 'react';

import type { EditorSurfaceProps } from '../editor.type';
import type { createEditorRuntime } from '../runtime/editorRuntime';

export interface EditorSurfaceContextValue extends EditorSurfaceProps {
  runtime: ReturnType<typeof createEditorRuntime>;
}
export const EditorSurfaceContext = createContext<EditorSurfaceContextValue | null>(null);
