import type { Config } from '@onlyoffice/doceditor-types';

import type { ResourceItem } from '@/domains/Resource';

export type { EditorSurfaceProps } from '../editor.type';

export interface OfficePresentationBindingProps {
  resourceInfo?: ResourceItem;
  documentType?: string;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

export interface OfficeEditorHostProps {
  config: Config;
  documentServerUrl: string;
  resourceName: string;
  onReady: () => void;
  onError: (error: unknown) => void;
}
