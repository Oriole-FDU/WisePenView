export type DriveViewMode = 'uploadQueue' | 'tableDrive' | 'favorites' | 'trash';

export interface DriveProps {
  viewMode?: DriveViewMode;
}
