import type { ReactNode } from 'react';

import type { ResourceAction } from '@/domains/_shared/access';
import type {
  DrawIoLatestSnapshotData,
  NoteInfoDisplayData,
  NoteVersionListPage,
} from '@/domains/Note';
import type { ResourceItem } from '@/domains/Resource';

import type { DrawioSaveState } from './_common/drawioProtocol';

export type { EditorSurfaceProps } from '../editor.type';

export interface DrawioViewConnectedProps {
  resourceId: string;
  data: DrawioViewData;
  onRefreshDrawioInfo: () => void;
}

export interface DrawioViewData {
  noteInfoDisplay: NoteInfoDisplayData;
  snapshot: DrawIoLatestSnapshotData;
  initialXml: string;
}

export type DrawioPresentationBindingProps = {
  resourceId?: string;
  resourceName?: string;
  ownerId?: string | null;
  currentActions?: ResourceAction[] | null;
  resourceInfo?: ResourceItem;
  copyVersion?: number;
  onPermissionSuccess?: () => void;
  onResourceChanged?: () => unknown | Promise<unknown>;
  titleMeta?: ReactNode;
  actions?: ReactNode;
};

export type SaveStatusTextProps = { state: DrawioSaveState };

export type VersionModalProps = {
  open: boolean;
  loading: boolean;
  error?: unknown;
  versions?: NoteVersionListPage;
  onClose: () => void;
};
