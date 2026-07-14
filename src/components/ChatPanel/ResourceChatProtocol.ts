import type { ChatFrontendState } from '@/domains/Chat';
import {
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  normalizeResourceKind,
  normalizeResourceViewer,
} from '@/utils/navigation/resourceTarget';

export interface ResourceChatResource {
  resourceId: string;
  resourceType: string;
  viewer?: string;
  editorType?: string;
}

interface ResourceOpenStateValue {
  resource_id: string;
  resource_type: string;
  viewer?: string;
  editor_type?: string;
}

export type ResourceOpenChatState = ChatFrontendState<
  'workspace_open_resource',
  ResourceOpenStateValue
>;

export interface ResourceChatStateProvider<State extends ChatFrontendState = ChatFrontendState> {
  key: string;
  getBlockedReason?: () => string | undefined;
  getStates: () => State[];
  allowToolNames?: readonly string[];
  forceEnabledSkillIds?: readonly string[];
}

export interface ResourceChatContext<State extends ChatFrontendState = ChatFrontendState> {
  providerKey: string;
  preview: string;
  states: State[];
}

export interface ResourceChatProtocolPort {
  provider?: ResourceChatStateProvider;
  context?: ResourceChatContext;
  clearContext: (context?: ResourceChatContext) => void;
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

export function buildResourceOpenState(resource: ResourceChatResource): ResourceOpenChatState {
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

export function createResourceChatStateProvider(
  resource: ResourceChatResource
): ResourceChatStateProvider {
  return {
    key: createResourceChatProviderKey(resource),
    getStates: () => [buildResourceOpenState(resource)],
  };
}
