import type { ResourceAction } from '@/domains/_shared/access';

export interface ResourcePermissionActionIconProps {
  action: ResourceAction;
  className?: string;
  size?: number;
}
