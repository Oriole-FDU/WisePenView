import type { ReactNode } from 'react';

import type { CourseOutlineNode } from '@/domains/Course';

import type { CourseOutlineContainerNode, CourseOutlineResourceTarget } from '../../_common/model';

export interface CourseOutlineNodeTitleProps {
  node: CourseOutlineNode;
  parentId?: string;
  editable: boolean;
  readIndicator?: ReactNode;
  canMoveContainer: (node: CourseOutlineContainerNode, offset: -1 | 1) => boolean;
  onCreateChild: (node: CourseOutlineContainerNode) => void;
  onMountFromDrive: (node: CourseOutlineContainerNode) => void;
  onUploadLocal: (node: CourseOutlineContainerNode) => void;
  onRename: (node: CourseOutlineContainerNode) => void;
  onMoveContainer: (node: CourseOutlineContainerNode, offset: -1 | 1) => void;
  onDelete: (node: CourseOutlineContainerNode) => void;
  onMoveResource: (target: CourseOutlineResourceTarget) => void;
  onRemoveResource: (target: CourseOutlineResourceTarget) => void;
}
