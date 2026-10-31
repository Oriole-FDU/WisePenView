import type { ResourcePermissionResourceType } from '@/domains/ResourceAccess';

export interface ResourcePermissionPanelProps {
  resourceId: string;
  resourceType: ResourcePermissionResourceType;
  onSuccess?: () => void;
}
