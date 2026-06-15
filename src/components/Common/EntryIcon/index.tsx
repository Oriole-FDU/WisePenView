import { RESOURCE_TYPE } from '@/domains/Resource';
import { FileText, Folder, Link, PenTool, Trash2 } from 'lucide-react';
import type { EntryIconProps } from './index.type';

const COLOR_SECONDARY = 'var(--muted)';
const COLOR_FOLDER = 'var(--warning)';

function renderResourceIcon(resourceType?: string, size = 18, color = COLOR_SECONDARY) {
  if (resourceType === RESOURCE_TYPE.NOTE) {
    return <PenTool size={size} color={color} />;
  }
  return <FileText size={size} color={color} />;
}

/** 统一展示文件夹、资源、链接和回收站图标 */
function EntryIcon({ entryType, resourceType, size = 18, color }: EntryIconProps) {
  switch (entryType) {
    case 'folder':
      return <Folder size={size} color={color ?? COLOR_FOLDER} />;
    case 'resource':
      return renderResourceIcon(resourceType, size, color ?? COLOR_SECONDARY);
    case 'link':
      return <Link size={size} color={color ?? COLOR_SECONDARY} />;
    case 'trash':
      return <Trash2 size={size} color={color ?? COLOR_SECONDARY} />;
    case 'loadMore':
      return null;
  }
}

export default EntryIcon;
