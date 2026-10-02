import { useRequiredContext } from '@/hooks/useRequiredContext';

import { EditorSurfaceContext } from './EditorSurfaceContext';

export function useEditorSurface() {
  return useRequiredContext(EditorSurfaceContext, 'EditorSurfaceProvider');
}
