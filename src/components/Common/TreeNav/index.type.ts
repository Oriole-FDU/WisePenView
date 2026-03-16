import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';
import type { TreeDriveMode } from '@/components/Drive/TreeDrive';

export interface TreeNavProps {
  /** 选中节点时回调：文件或文件夹 */
  onSelect?: (
    item: { type: 'file'; data: ResourceItem } | { type: 'folder'; data: Folder }
  ) => void;
  /** 是否显示「新建文件夹」/「新建标签」按钮，默认 true */
  showNewFolderButton?: boolean;
  /** 根路径（folder mode），默认 '/' */
  rootPath?: string;
  /** 视图模式：folder 为路径文件夹树，tag 为全量标签树（无文件预览） */
  mode?: TreeDriveMode;
  /** 外部 class */
  className?: string;
  /** 嵌入模式：为 true 时不显示新建按钮、不渲染内部 NewFolderModal，由外部（如 NewFolderModal）管理 */
  embedMode?: boolean;
  /** 嵌入模式下初始选中节点 key（如父路径），用于在树中高亮当前父级 */
  defaultSelectedKey?: string;
}
