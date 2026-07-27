import type { FolderTableColumn } from '@/components/Table';
import type { TFunction } from 'i18next';
import type { DriveTableRow } from './index.type';

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
