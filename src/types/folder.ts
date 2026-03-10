/**
 * Tag 领域模型及组合类型
 * 与 resource.openapi.json 中 Tag 相关 schema 对齐
 */

import type { ResourceItem } from './resource';
import type { TagTreeNode } from '@/services/Tag/index.type';

/** 按路径获取的文件夹+文件列表响应（getListByPath 用） */
export interface FolderListByPathResponse {
  /** 子文件夹（路径 tag 节点） */
  folders: TagTreeNode[];
  /** 该路径下的文件（分页返回，对应当前 filePage） */
  files: ResourceItem[];
  /** 该路径下文件总数（用于无限滚动判断 hasMore） */
  totalFiles: number;
}
