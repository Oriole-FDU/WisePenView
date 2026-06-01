import type { ReactNode } from 'react';

export interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  title?: string;
  nav?: ReactNode;
}
