import type { LucideIcon } from 'lucide-react';

import type { GuideToolId } from '@/constants/tour';

import type { SidebarViewTabKey } from './_common/store/useSidebarViewTabStore';

export interface SidebarViewTabProps {
  id: SidebarViewTabKey;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  toolId?: GuideToolId;
}
