import { resolveResourceIconType } from '@/domains/Resource';
import {
  Bot,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  Folder,
  HardDrive,
  Link,
  LoaderCircle,
  NotebookPen,
  Presentation,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { EntryIconProps } from './index.type';

const COLOR_SECONDARY = 'var(--muted)';
const COLOR_FOLDER = 'var(--warning)';
const COLOR_DOC = 'var(--accent)';
const COLOR_PDF = 'var(--danger)';
const COLOR_PPT = 'var(--warning)';
const COLOR_XLS = 'var(--success)';
const COLOR_CREATIVE = 'var(--accent)';
const COLOR_AI = 'var(--accent)';

function SharedFolderIcon({ size = 18, color }: { size?: number; color?: string }) {
  const folderColor = color ?? COLOR_FOLDER;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1"
        stroke={folderColor}
        strokeWidth="2"
      />
      <g stroke={folderColor} strokeWidth="1.8">
        <circle cx="17.6" cy="12.1" r="1.45" />
        <circle cx="13.3" cy="15.6" r="1.45" />
        <circle cx="18.6" cy="19" r="1.45" />
        <path d="m14.45 14.72 1.95-1.58" />
        <path d="m14.52 16.42 2.9 1.74" />
      </g>
    </svg>
  );
}

function renderResourceIcon(
  resourceType?: string,
  resourceName?: string,
  resourceIconType?: EntryIconProps['resourceIconType'],
  size = 18,
  color?: string
) {
  const iconType =
    resourceIconType ??
    resolveResourceIconType({
      resourceType,
      resourceName,
    });

  switch (iconType) {
    case 'note':
      return <NotebookPen size={size} color={color ?? COLOR_CREATIVE} />;
    case 'drawio':
      return <Workflow size={size} color={color ?? COLOR_CREATIVE} />;
    case 'skill':
      return <Wrench size={size} color={color ?? COLOR_AI} />;
    case 'agent':
      return <Bot size={size} color={color ?? COLOR_AI} />;
    case 'pdf':
      return <FileText size={size} color={color ?? COLOR_PDF} />;
    case 'doc':
      return <FileType size={size} color={color ?? COLOR_DOC} />;
    case 'ppt':
      return <Presentation size={size} color={color ?? COLOR_PPT} />;
    case 'xls':
      return <FileSpreadsheet size={size} color={color ?? COLOR_XLS} />;
    case 'md':
      return <FileCode size={size} color={color ?? COLOR_SECONDARY} />;
    case 'file':
      return <File size={size} color={color ?? COLOR_SECONDARY} />;
  }
}

/** 统一展示根目录、文件夹、资源、链接和加载占位图标 */
function EntryIcon({
  entryType,
  folderIconType,
  resourceType,
  resourceName,
  resourceIconType,
  size = 18,
  color,
}: EntryIconProps) {
  switch (entryType) {
    case 'root':
      return <HardDrive size={size} color={color ?? COLOR_CREATIVE} />;
    case 'folder':
      if (folderIconType === 'shared') {
        return <SharedFolderIcon size={size} color={color} />;
      }
      return <Folder size={size} color={color ?? COLOR_FOLDER} />;
    case 'resource':
      return renderResourceIcon(resourceType, resourceName, resourceIconType, size, color);
    case 'link':
      return <Link size={size} color={color ?? COLOR_SECONDARY} />;
    case 'loading':
      return <LoaderCircle size={size} color={color ?? COLOR_SECONDARY} />;
  }
}

export default EntryIcon;
