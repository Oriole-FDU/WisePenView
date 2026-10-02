import type { ReactNode } from 'react';

import { useEditorSurface } from './_context';
import type { EditorPresentation } from './editor.type';

/** 在编辑器 Provider 内调用宿主装配，保留标题、批注及专属动作的 Context。 */
export default function EditorWorkspace({
  children,
  ...presentation
}: EditorPresentation & { children: ReactNode }) {
  return useEditorSurface().renderWorkspace(presentation, children);
}
