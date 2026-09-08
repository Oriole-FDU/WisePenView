import type { LucideIcon } from 'lucide-react';

export interface HeaderNavItem {
  key: string;
  name: string;
  icon: LucideIcon;
  onPress: () => void;
  isDisabled?: boolean;
}

export interface HeaderNavSection {
  key: string;
  items: readonly HeaderNavItem[];
}

export interface HeaderNavProps {
  ariaLabel: string;
  activeKey?: string;
  collapsed?: boolean;
  items?: readonly HeaderNavItem[];
  sections?: readonly HeaderNavSection[];
  showIndicator?: boolean;
}
