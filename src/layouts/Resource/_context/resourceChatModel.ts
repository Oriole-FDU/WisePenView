import {
  normalizeResourceKind,
  normalizeResourceViewer,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
} from '@/domains/Resource/model/resourceTarget';
import type { FrontendStateEntry } from '@/frontendState';

export interface ResourceChatResource {
  resourceId: string;
  resourceType: string;
  viewer?: string;
  editorType?: string;
}

export interface ResourceChatProvider {
  key: string;
  getBlockedReason?: () => string | undefined;
  onDemandSkillIds?: readonly string[];
}

export interface ResourceChatContext {
  providerKey: string;
}

function resolveResourceEditorType(resource: ResourceChatResource): string | undefined {
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

export function createResourceChatProviderKey(resource: ResourceChatResource): string {
  return [
    resource.resourceType,
    resource.resourceId,
    resource.viewer,
    resolveResourceEditorType(resource),
  ]
    .filter(Boolean)
    .join(':');
}

export function buildResourceOpenState(
  resource: ResourceChatResource
): FrontendStateEntry<'workspace_open_resource'> {
  return {
    key: 'workspace_open_resource',
    value: {
      resource_id: resource.resourceId,
      resource_type: resource.resourceType,
      viewer: resource.viewer,
      editor_type: resolveResourceEditorType(resource),
    },
  };
}

export function createResourceChatProvider(resource: ResourceChatResource): ResourceChatProvider {
  return { key: createResourceChatProviderKey(resource) };
}
