import type { ReactNode } from 'react';

import type { ResourceAction } from '@/domains/_shared/access';
import type { ResourceItem } from '@/domains/Resource';

export interface ResourceToolbarOperationsProps {
  resourceId: string;
  resourceName: string;
  resourceType?: string;
  resourceInfo?: ResourceItem;
  currentActions?: ResourceAction[] | null;
  copyVersion?: number;
  onResolve: (handlers: ResourceToolbarOperationHandlers) => ReactNode;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

export interface ResourceToolbarOperationHandlers {
  deleteLabel?: string;
  isLocating: boolean;
  onCopy?: () => void;
  onCreateLink?: () => void;
  onMove?: () => void;
  onShare?: () => void;
  onOpenOriginal?: () => void;
  onDelete?: () => void;
}
