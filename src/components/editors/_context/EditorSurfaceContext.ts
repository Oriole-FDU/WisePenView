import { createContext } from 'react';

import type { createEditorRuntime } from '../_runtime/editorRuntime';
import type { EditorSurfaceProps } from '../editor.type';

export interface EditorSurfaceContextValue extends EditorSurfaceProps {
  runtime: ReturnType<typeof createEditorRuntime>;
}
export const EditorSurfaceContext = createContext<EditorSurfaceContextValue | null>(null);
