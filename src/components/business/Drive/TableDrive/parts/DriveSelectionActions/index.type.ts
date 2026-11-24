export interface DriveSelectionActionsProps {
  canMove: boolean;
  isTrashView: boolean;
  deleting: boolean;
  onClear: () => void;
  onMove: () => void;
  onDelete: () => void;
}
