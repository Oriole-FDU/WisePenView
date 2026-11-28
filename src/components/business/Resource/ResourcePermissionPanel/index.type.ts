import type {
  ResourcePermissionActionOption,
  ResourcePermissionResourceType,
  ResourcePermissionSubject,
} from '@/domains/ResourceAccess';

export interface ResourcePermissionPanelProps {
  resourceId: string;
  resourceType: ResourcePermissionResourceType;
  onSuccess?: () => void;
}

export interface SubjectPermissionPopoverProps {
  subject: ResourcePermissionSubject;
  actionOptions: ResourcePermissionActionOption[];
  onActionToggle: (
    subject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => void;
}
