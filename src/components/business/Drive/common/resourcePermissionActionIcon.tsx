import {
  Bot,
  Download,
  Eye,
  GitFork,
  ListTree,
  type LucideIcon,
  MessageCircle,
  MessageSquareText,
  PencilLine,
  ShieldCheck,
} from 'lucide-react';

import { RESOURCE_ACTION, type ResourceAction } from '@/domains/Resource';

interface ResourcePermissionActionIconProps {
  action: ResourceAction;
  className?: string;
  size?: number;
}

const RESOURCE_PERMISSION_ACTION_ICON_MAP: Record<ResourceAction, LucideIcon> = {
  [RESOURCE_ACTION.DISCOVER]: ListTree,
  [RESOURCE_ACTION.VIEW]: Eye,
  [RESOURCE_ACTION.LOAD]: Bot,
  [RESOURCE_ACTION.EDIT]: PencilLine,
  [RESOURCE_ACTION.INLINE_COMMENT]: MessageSquareText,
  [RESOURCE_ACTION.DOWNLOAD_WATERMARK]: ShieldCheck,
  [RESOURCE_ACTION.DOWNLOAD_ORIGINAL]: Download,
  [RESOURCE_ACTION.FORK]: GitFork,
  [RESOURCE_ACTION.COMMENT]: MessageCircle,
};

function ResourcePermissionActionIcon({
  action,
  className,
  size = 14,
}: ResourcePermissionActionIconProps) {
  const Icon = RESOURCE_PERMISSION_ACTION_ICON_MAP[action];
  return <Icon aria-hidden="true" className={className} focusable="false" size={size} />;
}

export default ResourcePermissionActionIcon;
