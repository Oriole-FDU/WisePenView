export interface ChatHeaderProps {
  panelTitle: string;
  sessionBarOpen: boolean;
  showCollapseButton: boolean;
  /** Workspace 右栏贴窗时为 true，为 Win overlay 按钮让位 */
  reserveTitleBarEnd?: boolean;
  onCollapsePanel: () => void;
  onNewChat: () => void;
  onToggleSessionBar: () => void;
}
