import type { Selection, SortDescriptor } from '@heroui/react';
import type { ReactNode } from 'react';

import type { GroupMember } from '@/domains/Group';

import type { GroupDisplayConfig } from '../../GroupDisplayConfig';

export type MemberListInlineEditKind = 'role' | 'quota';

export interface MemberListInlineDraft {
  role?: GroupMember['role'];
  quota?: string;
}

export interface MemberListPaginationConfig {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
}

export interface MemberListTableProps {
  groupDisplayConfig: GroupDisplayConfig;
  pagination?: MemberListPaginationConfig;
  members: GroupMember[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  selectedKeys: Selection;
  disabledSelectionKeys?: Iterable<string>;
  editingRowId: string | null;
  editingKind: MemberListInlineEditKind | null;
  savingRowId?: string | null;
  errorRowId?: string | null;
  errorMessage?: string | null;
  inlineDraft: MemberListInlineDraft;
  onPageChange: (page: number, size: number) => void;
  onSelectionChange: (keys: Selection, currentPageMembers: GroupMember[]) => void;
  onStartInlineEdit: (member: GroupMember, kind: MemberListInlineEditKind) => void;
  onInlineDraftChange: (draft: MemberListInlineDraft) => void;
  onInlineSave: (member: GroupMember) => void | Promise<void>;
  onInlineCancel: () => void;
  onDismissInlineError?: () => void;
  onDeleteMember: (member: GroupMember) => void;
  toolbar?: ReactNode;
  batchEditMode?: boolean;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}
