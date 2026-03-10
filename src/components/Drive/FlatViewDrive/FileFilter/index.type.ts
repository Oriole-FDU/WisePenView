import type {
  TagQueryLogicMode,
  ResourceSortBy,
  ResourceSortDir,
} from '@/services/Resource';

/** FileFilter 维护的筛选/排序数据，可直接用于 GetUserResourcesRequest */
export interface FileFilterValue {
  /** 已选标签 ID 列表 */
  tagIds: string[];
  /** 已选标签名称列表（与 tagIds 一一对应） */
  tagNames: string[];
  /** 标签匹配逻辑：OR=包含任意，AND=包含全部 */
  tagQueryLogicMode: TagQueryLogicMode;
  /** 排序字段 */
  sortBy: ResourceSortBy;
  /** 排序方向 */
  sortDir: ResourceSortDir;
}

export interface FileFilterProps {
  /** 小组 ID，不传则展示个人标签树 */
  groupId?: string;
  /** 受控：当前筛选与排序配置 */
  value?: FileFilterValue;
  /** 值变化时通知父组件 */
  onChange?: (value: FileFilterValue) => void;
}
