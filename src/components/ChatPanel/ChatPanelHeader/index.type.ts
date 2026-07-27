export interface ChatPanelHeaderProps {
  panelTitle: string;
  sessionBarOpen: boolean;
  showCollapseButton: boolean;
  onCollapsePanel: () => void;
  onNewChat: () => void;
  onToggleSessionBar: () => void;
}
