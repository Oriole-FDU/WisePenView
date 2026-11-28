import type { GroupResConfig } from '@/domains/Group';

export interface GroupDefaultAccessPermissionModalProps {
  isOpen: boolean;
  groupId: string;
  groupResConfig: GroupResConfig;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export interface DefaultMemberScopePreviewProps {
  title: string;
}
