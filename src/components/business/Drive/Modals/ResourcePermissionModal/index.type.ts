import type { ResourcePermissionResourceType } from '@/domains/ResourceAccess';

export interface ResourcePermissionModalTarget {
  resourceId: string;
  resourceType: ResourcePermissionResourceType;
  resourceName?: string;
  fallbackTagId?: string;
}

export interface ResourcePermissionModalProps {
  isOpen: boolean;
  groupId?: string;
  target?: ResourcePermissionModalTarget | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
