import type { ResourceItem } from '@/domains/Resource';

export type { EditorSurfaceProps } from '../editor.type';

export interface PdfPresentationBindingProps {
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
}
