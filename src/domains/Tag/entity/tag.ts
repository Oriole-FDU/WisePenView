/**
 * Tag 领域模型及组合类型
 */

import type { UserDisplayBase } from '@/domains/User';

import type { AccessControlScope, TagResourceAction, TagVisibilityModeString } from '../enum';

/** 后端以 JSON 字符串透传；前端保留未知字段，避免不同功能相互覆盖。 */
export interface TagMetaInfo {
  schema?: string;
  sortOrder?: number;
  [key: string]: unknown;
}

/** Mapper 归一化后的标签树节点。 */
export interface TagTreeNode {
  tagId: string;
  tagName: string;
  groupId?: string;
  tagDesc?: string;
  tagIcon?: string;
  tagColor?: string;
  tagMetaInfo?: TagMetaInfo;
  tagCreator?: string;
  creatorInfo?: UserDisplayBase;
  isPath?: boolean;
  visibilityMode?: TagVisibilityModeString;
  taggedResourceAclGrantScope?: AccessControlScope;
  taggedResourceAclGrantSpecifiedUsers?: string[];
  taggedResourceGrantedActionsMask?: number;
  tagMountPermissionScope?: AccessControlScope;
  tagMountSpecifiedUsers?: string[];
  grantedActions?: TagResourceAction[];
  parentId?: string;
  children?: TagTreeNode[];
}
