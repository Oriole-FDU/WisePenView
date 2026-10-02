import {
  createEditorChatProviderKey,
  type EditorChatResource as ResourceChatResource,
  resolveResourceEditorType,
} from '@/components/editors/_runtime/editorChat';
import type { EditorChatProvider as ResourceChatProvider } from '@/components/editors/editor.type';
import type { FrontendStateEntry } from '@/frontendState';

export type { EditorChatResource as ResourceChatResource } from '@/components/editors/_runtime/editorChat';
export type {
  EditorChatContext as ResourceChatContext,
  EditorChatProvider as ResourceChatProvider,
} from '@/components/editors/editor.type';
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
  return { key: createEditorChatProviderKey(resource) };
}
