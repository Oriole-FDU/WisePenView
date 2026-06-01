import { RESOURCE_TYPE } from '@/domains/Resource';
import { AiOutlineFolder, AiOutlineLink } from 'react-icons/ai';
import { LuTrash2 } from 'react-icons/lu';
import { RiFileTextLine, RiPenNibFill } from 'react-icons/ri';
import type { EntryIconProps } from './index.type';

const COLOR_SECONDARY = 'var(--ant-color-text-secondary)';
const COLOR_FOLDER = 'var(--ant-color-warning)';

function renderResourceIcon(resourceType?: string, size = 18, color = COLOR_SECONDARY) {
  if (resourceType === RESOURCE_TYPE.NOTE) {
    return <RiPenNibFill size={size} color={color} />;
  }
  return <RiFileTextLine size={size} color={color} />;
}

/** 统一展示文件夹、资源、链接和回收站图标 */
function EntryIcon({ entryType, resourceType, size = 18, color }: EntryIconProps) {
  switch (entryType) {
    case 'folder':
      return <AiOutlineFolder size={size} color={color ?? COLOR_FOLDER} />;
    case 'resource':
      return renderResourceIcon(resourceType, size, color ?? COLOR_SECONDARY);
    case 'link':
      return <AiOutlineLink size={size} color={color ?? COLOR_SECONDARY} />;
    case 'trash':
      return <LuTrash2 size={size} color={color ?? COLOR_SECONDARY} />;
    case 'loadMore':
      return null;
  }
}

export default EntryIcon;
