/** 调用点：ResourceHost 与 CourseResourceHost 装配，资源工作区、笔记及独立聊天面板消费；提供资源导航和聊天绑定能力。 */
export { ResourceChatBinding, ResourceChatPanel } from './ResourceChatBinding';
export { ResourceChatBindingProvider } from './ResourceChatBindingProvider';
export {
  DEFAULT_RESOURCE_HOST_ID,
  type OpenResourceFn,
  type ResourceHostContextValue,
} from './ResourceHostContext';
export { ResourceHostProvider } from './ResourceHostProvider';
export {
  useResourceHostChatContextActions,
  useResourceHostContext,
  useResourceHostId,
} from './useResourceHostContext';
