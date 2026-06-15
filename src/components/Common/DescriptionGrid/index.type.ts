import type { ReactNode } from 'react';

export interface DescriptionGridItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
}

export interface DescriptionGridProps {
  items: DescriptionGridItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}
