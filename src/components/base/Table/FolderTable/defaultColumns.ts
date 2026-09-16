import type { TFunction } from 'i18next';

import type { FolderTableColumn, FolderTableRow } from './index.type';

export function createDefaultFolderColumns<T extends FolderTableRow = FolderTableRow>(
  t: TFunction<'table'>
): FolderTableColumn<T>[] {
  return [
    {
      id: 'name',
      label: t('column.name'),
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
      label: t('column.size'),
      width: 'folderSize',
      renderCell: (row) =>
        row.entryType === 'loading' ? '' : (row.sizeLabel ?? t('placeholder.dash')),
    },
    {
      id: 'type',
      label: t('column.type'),
      width: 'folderType',
      allowsSorting: true,
      getSortValue: (row) => row.typeLabel,
      renderCell: (row) => (row.entryType === 'loading' ? '' : row.typeLabel),
    },
    {
      id: 'actions',
      label: null,
      width: 'folderAction',
      isActionColumn: true,
    },
  ];
}
