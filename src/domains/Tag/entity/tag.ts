/**
 * Tag 领域模型及组合类型
 */

import type { ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';

/** 按标签获取的子标签+文件列表响应（getResByTag 用） */
export interface TagListByTagResponse {
  /** 子标签 */
  tags: TagTreeNode[];
  /** 该标签下的文件（分页返回，对应当前 filePage） */
  files: ResourceItem[];
  /** 该标签下文件总数（用于无限滚动判断 hasMore） */
  totalFiles: number;
}
