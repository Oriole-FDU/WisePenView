import type { ResourceSidePanelMode } from './_store/useResourceSidePanelStore';
import { useResourceSidePanelStore } from './_store/useResourceSidePanelStore';

/**
 * 资源侧栏的共享动作。
 *
 * 面板模式按资源存在持久化 store 里，这里提供无 Provider 的读写入口，
 * 供顶栏动作、编辑器宿主能力复用，避免调用方各自直接操作 store。
 */
export const resourceSidePanelActions = {
  setMode: (resourceId: string, mode: ResourceSidePanelMode) =>
    useResourceSidePanelStore.getState().setMode(resourceId, mode),
  toggleMode: (resourceId: string, mode: Exclude<ResourceSidePanelMode, 'closed'>) =>
    useResourceSidePanelStore.getState().toggleMode(resourceId, mode),
  openInlineComments: (resourceId: string) =>
    useResourceSidePanelStore.getState().setMode(resourceId, 'inlineComment'),
};
