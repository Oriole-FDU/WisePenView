import type { DataNode } from '@/components/Tree';
import type { SkillFileNode } from '@/domains/Skill';

export type SkillFileDropPosition = 'before' | 'inside' | 'after';

export interface SkillPendingCreate {
  kind: 'file' | 'folder';
  parentFolderId?: string;
}

export interface SkillFileTreeProps {
  files: SkillFileNode[];
  prependNodes?: DataNode[];
  selectedFileId?: string;
  selectedNodeId?: string;
  expandedKeys?: string[];
  pendingCreate?: SkillPendingCreate | null;
  dirtyNodeIds?: Set<string>;
  isOwner?: boolean;
  onSelect: (fileId: string) => void;
  onCommitCreate: (name: string, kind: 'file' | 'folder') => void;
  onCancelCreate: () => void;
  onDeleteFile: (fileId: string) => void;
  onMoveFile?: (params: {
    dragId: string;
    dropId: string;
    dropPosition: SkillFileDropPosition;
  }) => void;
}
