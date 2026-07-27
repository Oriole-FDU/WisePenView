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

  // 系统共享目录使用独立图标。
  const folderIconType =
    node.type === 'folder' && node.systemType === 'shared' ? 'shared' : undefined;

  // 只有资源主节点携带资源类型。
  const resourceType = node.type === 'resource' ? node.resourceType : undefined;

  // 资源和链接指向同一资源，复用资源图标。
  const resourceIconType =
    node.type === 'resource' || node.type === 'link' ? node.resourceIconType : undefined;

  // 资源和链接展示文件大小，其余节点使用占位符。
  const sizeLabel =
    (node.type === 'resource' || node.type === 'link') && node.size != null
      ? formatFileSize(node.size)
      : '—';

  // 只有根节点和文件夹可展开。
  const isExpandable = node.type === 'root' || node.type === 'folder';

  // 递归转换已加载的子节点。
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
