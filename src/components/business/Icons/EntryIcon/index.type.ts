import type { ResourceIconType } from '@/domains/Resource';

export type EntryType = 'root' | 'folder' | 'file' | 'resource' | 'link' | 'loading';

export interface EntryIconProps {
  /** 展示对象类型；resource 可结合 resourceType 渲染具体资源图标 */
  entryType: EntryType;
  /** folder 类型的细分展示；用于共享目录这类系统文件夹 */
  folderVariant?: 'default' | 'shared';
  /** 后端资源类型，用于兜底解析展示图标 */
  resourceType?: string;
  /** 图标展示用资源细分类型 */
  resourceIconType?: ResourceIconType;
  size?: number;
  /** 覆盖默认颜色；默认颜色来自资源图标语义 token */
  color?: string;
}
