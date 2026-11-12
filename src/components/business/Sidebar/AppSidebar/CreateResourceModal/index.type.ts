import type { DriveCreateType } from '@/components/business/Drive/Modals';
import type { RootNode } from '@/domains/Drive';

export type CreateResourceType = 'note' | Exclude<DriveCreateType, 'folder'>;

export interface ResourceRoot extends RootNode {
  tagId: string;
  canMountResources: true;
}

export interface CreatedResource {
  resourceId: string;
  type: CreateResourceType;
  root: ResourceRoot;
}

export interface CreateResourceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (resource: CreatedResource) => void;
}
