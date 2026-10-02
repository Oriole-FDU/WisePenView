import {
  normalizeResourceKind,
  normalizeResourceViewer,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
} from '@/domains/Resource/model/resourceTarget';

export interface EditorChatResource {
  resourceId: string;
  resourceType: string;
  viewer?: string;
  editorType?: string;
}

export function resolveResourceEditorType(resource: EditorChatResource): string | undefined {
  if (resource.editorType) return resource.editorType;
  const resourceType = normalizeResourceKind(resource.resourceType);
  const viewer = normalizeResourceViewer(resource.viewer);
  if (resourceType === RESOURCE_KIND.FILE) {
    if (viewer === RESOURCE_VIEWER.PDF_PREVIEW) return 'pdf';
    if (viewer === RESOURCE_VIEWER.OFFICE) return 'office';
    return 'file';
  }
  return viewer;
}

export function createEditorChatProviderKey(resource: EditorChatResource): string {
  return [
    resource.resourceType,
    resource.resourceId,
    resource.viewer,
    resolveResourceEditorType(resource),
  ]
    .filter(Boolean)
    .join(':');
}
