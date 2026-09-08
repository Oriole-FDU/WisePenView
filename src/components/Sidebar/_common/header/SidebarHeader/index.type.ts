import type { ReactNode } from 'react';

export interface SidebarHeaderProps {
  collapsed: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onToggle?: () => void;
  title?: string;
  nav?: ReactNode;
}
