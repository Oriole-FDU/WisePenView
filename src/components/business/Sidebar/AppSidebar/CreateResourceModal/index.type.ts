import type { DriveCreateType } from '@/components/business/Drive/Modals';

export type CreateResourceType = 'note' | Exclude<DriveCreateType, 'folder'>;

export interface CreateResourceModalProps {
  isOpen: boolean;
  loadingType?: CreateResourceType;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: CreateResourceType) => void;
}
