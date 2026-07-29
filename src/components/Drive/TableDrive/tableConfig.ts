import type { FolderTableColumn } from '@/components/Table';
import { formatFileSize } from '@/utils/format/formatFileSize';
import type { TFunction } from 'i18next';
import { getDriveNodeLabel, isDriveSharedFolderNode } from '../common/driveComponentModel';
import type { DriveRow, DriveTableRow } from './index.type';

export function toDriveTableRow(node: DriveRow, t: TFunction<'drive'>): DriveTableRow {
  if (node.type === 'loading') {
    return {
      id: node.id,
      name: node.label || t('node.loading'),
      entryType: 'loading',
      typeLabel: '',
      node,
    };
  }

  // 统一处理系统目录和未命名节点的显示名称。
  const name = getDriveNodeLabel(node);

  // 根据节点种类生成类型文案。
  let typeLabel: string;
  switch (node.type) {
    case 'root':
      typeLabel = t('node.drive');
      break;
    case 'folder':
      typeLabel = t('node.folder');
      break;
    case 'resource':
      typeLabel = node.resourceType ?? t('node.resource');
      break;
    case 'link':
      typeLabel = t('node.link');
      break;
  }

  const folderIconType =
    node.type === 'folder' && node.systemType === 'shared' ? 'shared' : undefined;
  const resourceType = node.type === 'resource' ? node.resourceType : undefined;
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;
  const sizeLabel =
    (node.type === 'resource' || node.type === 'link') && node.size != null
      ? formatFileSize(node.size)
      : '—';
  const isExpandable = node.type === 'root' || node.type === 'folder';
  const children = node.children?.map((child) => toDriveTableRow(child, t));

  return {
    id: node.id,
    name,
    entryType: node.type,
    folderIconType,
    resourceType,
    resourceIconType,
    sizeLabel,
    typeLabel,
    isExpandable,
    children,
    node,
  };
}

export function buildDriveTableRowMap(rows: DriveTableRow[]): Map<string, DriveTableRow> {
  const map = new Map<string, DriveTableRow>();
  const visit = (row: DriveTableRow) => {
    map.set(row.id, row);
    row.children?.forEach(visit);
  };
  rows.forEach(visit);
  return map;
}

export function isDrivePinnedFirstRow(row: DriveTableRow): boolean {
  return isDriveSharedFolderNode(row.node);
}

export const buildDriveTableColumns = (
  t: TFunction<'drive'>
): FolderTableColumn<DriveTableRow>[] => [
  {
    id: 'name',
    label: t('table.columns.name'),
    width: 'fill',
    align: 'start',
    isRowHeader: true,
    isNameColumn: true,
    allowsSorting: true,
    sortFolderGroup: true,
    getSortValue: (row) => row.name,
  },
  {
    id: 'size',
    label: t('table.columns.size'),
    width: 'folderSize',
    renderCell: (row) => (row.entryType === 'loading' ? '' : (row.sizeLabel ?? '—')),
  },
  {
    id: 'type',
    label: t('table.columns.type'),
    width: 'folderType',
    allowsSorting: true,
    getSortValue: (row) => row.typeLabel,
    renderCell: (row) => (row.entryType === 'loading' ? '' : row.typeLabel),
  },
  {
    id: 'actions',
    label: t('table.columns.actions'),
    width: 'folderAction',
    isActionColumn: true,
  },
];
