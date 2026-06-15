import type { ResourceItem } from '@/domains/Resource';

export interface EditStickerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  file: ResourceItem | null;
}
