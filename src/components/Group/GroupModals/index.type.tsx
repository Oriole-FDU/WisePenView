export interface CreateGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

export interface JoinGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

export interface ExitGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupName: string;
  groupId?: string;
}

export interface DissolveGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId: string;
  groupName: string;
}

export interface EditGroupInfoModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  groupId?: string;
  groupName?: string;
  description?: string;
  cover?: string;
}
