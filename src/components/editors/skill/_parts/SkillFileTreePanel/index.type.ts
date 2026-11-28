import type { TFunction } from 'i18next';
import type { RefObject } from 'react';

import type { DataNode } from '@/components/base/Tree';
import type { SkillFileNode } from '@/domains/Skill';

import type { useSkillFileActionsController } from '../../_hooks/useSkillFileActionsController';
import type { SkillSaveQueueItem } from '../SkillSaveQueueDock/index.type';

export interface SkillFileTreePanelProps {
  canEdit: boolean;
  configTreeNodes: DataNode[];
  dirtyNodeIds: Set<string>;
  fileActions: SkillFileActions;
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: SkillFileNode[];
  onTreeSelect: (nodeId: string) => void;
  saveQueueItems: SkillSaveQueueItem[];
  selectedFileId: string;
  selectedTreeNodeId: string;
  t: TFunction<'skill'>;
  onRetrySave: () => void;
}

export type SkillFileActions = ReturnType<typeof useSkillFileActionsController>;
