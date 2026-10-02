import { lazy } from 'react';

import { RESOURCE_KIND, RESOURCE_VIEWER } from '@/domains/Resource/model/resourceTarget';

import type { EditorKind, EditorTarget } from './editor.type';

export const editorRegistry = {
  note: lazy(() => import('./note')),
  pdf: lazy(() => import('./pdf')),
  skill: lazy(() => import('./skill')),
  agent: lazy(() => import('./agent')),
  drawio: lazy(() => import('./drawio')),
  office: lazy(() => import('./office')),
} as const;

export function resolveEditorKind(target: EditorTarget): EditorKind | undefined {
  if (target.resourceType === RESOURCE_KIND.FILE) {
    if (target.viewer === RESOURCE_VIEWER.PDF_PREVIEW) return 'pdf';
    if (target.viewer === RESOURCE_VIEWER.OFFICE) return 'office';
    return undefined;
  }
  if (target.resourceType === target.viewer) return target.resourceType;
  return undefined;
}
