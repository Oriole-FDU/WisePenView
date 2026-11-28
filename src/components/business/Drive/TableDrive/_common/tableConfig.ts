import type { TFunction } from 'i18next';

import type { FolderTableColumn } from '@/components/base/Table';
import { resolveResourceKind, RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import type { UserDisplayBase } from '@/domains/User';
import { formatFileSize } from '@/utils/format/formatFileSize';

import { getDriveNodeLabel } from '../../_common/driveComponentModel';
import type { DriveRow, DriveTableRow } from '../index.type';

const getDriveCreatorName = (user?: UserDisplayBase): string => user?.nickname?.trim() || '—';

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
  const resourceKind =
    node.type === 'resource' || node.type === 'link'
      ? resolveResourceKind(node.resourceType)
      : undefined;
  switch (node.type) {
    case 'root':
      typeLabel = t('node.drive');
      break;
    case 'folder':
      typeLabel =
        node.systemType && node.systemType !== 'trash' ? t('node.system') : t('node.folder');
      break;
    case 'resource':
      typeLabel =
        resourceKind === RESOURCE_KIND.HTML
          ? t('node.htmlPage')
          : (node.resourceType ?? t('node.resource'));
      break;
    case 'link':
      typeLabel = resourceKind === RESOURCE_KIND.HTML ? t('node.htmlPage') : t('node.link');
      break;
  }

  const sizeLabel =
    (node.type === 'resource' || node.type === 'link') && node.size != null
      ? formatFileSize(node.size)
      : '—';
  const isExpandable = node.type === 'root' || node.type === 'folder';
  const children = node.children?.map((child) => toDriveTableRow(child, t));

  return {
    id: node.id,
    name,
    entryType: node.type === 'resource' ? 'file' : node.type,
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
  return (
    row.node.type === 'folder' && Boolean(row.node.systemType) && row.node.systemType !== 'trash'
  );
}

export const buildDriveTableColumns = (
  t: TFunction<'drive'>,
  showFolderCreator: boolean
): FolderTableColumn<DriveTableRow>[] => {
  const columns: FolderTableColumn<DriveTableRow>[] = [
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
      allowsSorting: true,
      getSortValue: (row) =>
        row.node.type === 'resource' || row.node.type === 'link' ? row.node.size : undefined,
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
  ];

  if (showFolderCreator) {
    columns.push({
      id: 'creator',
      label: t('table.columns.creator'),
      width: 'md',
      allowsSorting: true,
      getSortValue: (row) =>
        row.node.type === 'folder' ? getDriveCreatorName(row.node.creatorInfo) : undefined,
      renderCell: (row) =>
        row.entryType === 'loading' || row.node.type !== 'folder'
          ? ''
          : getDriveCreatorName(row.node.creatorInfo),
    });
  }

  columns.push({
    id: 'actions',
    label: t('table.columns.actions'),
    width: 'folderAction',
    isActionColumn: true,
  });

  return columns;
};
