import type { ReactNode } from 'react';

export interface GroupSettingsSectionProps {
  title: string;
  compact?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}
