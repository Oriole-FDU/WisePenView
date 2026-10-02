/** 调用点：ResourceHost 与 CourseResourceHost 装配，资源顶栏、工作区与 office 编辑器消费；提供资源宿主导航与面包屑。 */
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
export { useResourceHostContext, useResourceHostId } from './useResourceHostContext';
