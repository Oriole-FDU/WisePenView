import type { ResourceItem } from '@/domains/Resource';

export interface DeleteFileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}
