import {
  Bot,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  HardDrive,
  Image,
  Link,
  LoaderCircle,
  NotebookPen,
  Presentation,
  Share2,
  Video,
  Workflow,
  Wrench,
} from 'lucide-react';

import { resolveResourceIconType } from '@/domains/Resource';

import type { EntryIconProps } from './index.type';

const COLOR_ROOT = 'var(--resource-icon-root)';
const COLOR_FOLDER = 'var(--resource-icon-folder)';
const COLOR_NOTE = 'var(--resource-icon-note)';
const COLOR_DRAWIO = 'var(--resource-icon-drawio)';
const COLOR_SKILL = 'var(--resource-icon-skill)';
const COLOR_AGENT = 'var(--resource-icon-agent)';
const COLOR_DOC = 'var(--resource-icon-doc)';
const COLOR_PDF = 'var(--resource-icon-pdf)';
const COLOR_PPT = 'var(--resource-icon-ppt)';
const COLOR_XLS = 'var(--resource-icon-xls)';
const COLOR_IMAGE = 'var(--resource-icon-image)';
const COLOR_VIDEO = 'var(--resource-icon-video)';
const COLOR_CODE = 'var(--resource-icon-code)';
const COLOR_FILE = 'var(--resource-icon-file)';
const COLOR_LINK = 'var(--resource-icon-link)';
const COLOR_LOADING = 'var(--resource-icon-loading)';

function renderResourceIcon(
  resourceType?: string,
  resourceIconType?: EntryIconProps['resourceIconType'],
  size = 18,
  color?: string
) {
  const iconType = resourceIconType ?? resolveResourceIconType(resourceType);

  switch (iconType) {
    case 'note':
      return <NotebookPen size={size} color={color ?? COLOR_NOTE} />;
    case 'drawio':
      return <Workflow size={size} color={color ?? COLOR_DRAWIO} />;
    case 'skill':
      return <Wrench size={size} color={color ?? COLOR_SKILL} />;
    case 'agent':
      return <Bot size={size} color={color ?? COLOR_AGENT} />;
    case 'pdf':
      return <FileText size={size} color={color ?? COLOR_PDF} />;
    case 'doc':
      return <FileType size={size} color={color ?? COLOR_DOC} />;
    case 'ppt':
      return <Presentation size={size} color={color ?? COLOR_PPT} />;
    case 'xls':
      return <FileSpreadsheet size={size} color={color ?? COLOR_XLS} />;
    case 'image':
      return <Image size={size} color={color ?? COLOR_IMAGE} />;
    case 'video':
      return <Video size={size} color={color ?? COLOR_VIDEO} />;
    case 'md':
      return <FileCode size={size} color={color ?? COLOR_CODE} />;
    case 'file':
      return <File size={size} color={color ?? COLOR_FILE} />;
  }
}

/** 统一展示根目录、文件夹、资源、链接和加载占位图标 */
function EntryIcon({
  entryType,
  folderVariant = 'default',
  resourceType,
  resourceIconType,
  size = 18,
  color,
}: EntryIconProps) {
  switch (entryType) {
    case 'root':
      return <HardDrive size={size} color={color ?? COLOR_ROOT} />;
    case 'folder':
      if (folderVariant === 'shared') {
        return <Share2 size={size} color={color ?? COLOR_FOLDER} />;
      }
      return <Folder size={size} color={color ?? COLOR_FOLDER} />;
    case 'resource':
      return renderResourceIcon(resourceType, resourceIconType, size, color);
    case 'link':
      return <Link size={size} color={color ?? COLOR_LINK} />;
    case 'loading':
      return <LoaderCircle size={size} color={color ?? COLOR_LOADING} />;
  }
}

export default EntryIcon;
