import type { ReactNode } from 'react';

import type { DriveTableRow } from '../../index.type';

export interface DriveDetailPanelProps {
  selectedRow?: DriveTableRow;
  isEditMode: boolean;
  selectedCount: number;
}

export interface DetailMetaItem {
  key: string;
  label: string;
  value: ReactNode;
  icon: ReactNode;
}
