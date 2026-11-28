import type { DriveTableRow } from '../../index.type';

export interface DriveDetailPanelProps {
  selectedRow?: DriveTableRow;
  isEditMode: boolean;
  selectedCount: number;
}

export type DetailMetaLoadingProps = { label: string };
