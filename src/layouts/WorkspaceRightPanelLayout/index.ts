/** 调用点：资源工作区与课程学习页；提供唯一的可拖拽右侧辅助面板布局。 */
export { useWorkspaceRightPanel } from './controllers/useWorkspaceRightPanel';
export type { WorkspaceRightPanelLayoutProps } from './index.type';
export {
  clampWorkspacePanelWidth,
  createWorkspacePanelSlots,
  getWorkspacePanelTargetId,
  WORKSPACE_PANEL_IDS,
  WORKSPACE_PANEL_SLOT_WIDTH_BOUNDS,
  type WorkspacePanelId,
  type WorkspacePanelSlot,
  type WorkspacePanelWidthBounds,
} from './workspacePanelModel';
export { WorkspacePanelPortal } from './WorkspacePanelPortal';
export { workspaceRightPanelActions } from './workspaceRightPanelActions';
export { default as WorkspaceRightPanelLayout } from './WorkspaceRightPanelLayout';
