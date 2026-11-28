import type { ResourceItem } from '@/domains/Resource';

/** 资源点赞、收藏、阅读与一般评论的统一互动面板。 */
export interface ResourceInteractionPanelProps {
  resource: ResourceItem;
  onResourceChanged?: () => unknown | Promise<unknown>;
  onClose?: () => void;
}
