/** 调用点：ResourceHost 与 CourseResourceHost 装配，资源工作区、笔记及独立聊天面板消费；提供资源导航和聊天绑定能力。 */
export { ResourceChatBinding, ResourceChatPanel } from './ResourceChatBinding';
export { ResourceChatBindingProvider } from './ResourceChatBindingProvider';
export { ResourceEditorProvider } from './ResourceEditorProvider';
export {
  DEFAULT_RESOURCE_HOST_ID,
  type OpenResourceFn,
  type ResourceHeaderNavigation,
  type ResourceHostContextValue,
  type ResourceHostDriveNavigationTarget,
  type ResourceHostRouteContext,
  type ResourceHostViewerNavigationTarget,
} from './ResourceHostContext';
export { ResourceHostProvider } from './ResourceHostProvider';
export { useResourceEditor } from './useResourceEditor';
export {
  useResourceHostChatContextActions,
  useResourceHostContext,
  useResourceHostId,
} from './useResourceHostContext';
