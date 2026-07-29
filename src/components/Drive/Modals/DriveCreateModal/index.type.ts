export type DriveCreateType = 'agent' | 'drawio' | 'folder' | 'skill';

export interface DriveCreateModalProps {
  type: DriveCreateType;
  isOpen: boolean;
  parentId?: string;
  groupId?: string;
  pathTagId?: string;
  parentLabel?: string;
  existingFolderNames?: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdId: string, type: DriveCreateType) => void | Promise<void>;
}
