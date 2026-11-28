export type SidebarMotionPhase = 'expanded' | 'collapsing' | 'collapsed' | 'expanding';

export interface AdminSidebarProps {
  onToggle: () => void;
  collapsed?: boolean;
  motionPhase?: SidebarMotionPhase;
}
