import type { PublishAnnouncementRequest } from '../../index.type';

export interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: PublishAnnouncementRequest) => Promise<void>;
}
