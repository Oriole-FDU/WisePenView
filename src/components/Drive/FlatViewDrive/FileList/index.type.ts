import type { FileFilterValue } from '@/components/Drive/FlatViewDrive/FileFilter/index.type';

export interface FileListProps {
  /** 筛选与排序配置，用于请求列表接口 */
  filter: FileFilterValue;
}
