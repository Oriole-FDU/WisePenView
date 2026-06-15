import type { Key, ReactNode } from 'react';

export interface SegmentedTabItem<T extends Key = string> {
  key: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends Key = string> {
  ariaLabel: string;
  items: Array<SegmentedTabItem<T>>;
  selectedKey: T;
  onSelectionChange: (key: T) => void;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
  block?: boolean;
  size?: 'sm' | 'md';
}
