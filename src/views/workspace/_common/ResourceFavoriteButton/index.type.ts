export interface ResourceFavoriteButtonProps {
  /** 资源 ID */
  resourceId: string;
  /** 展示形态：顶部图标或讨论栏行卡片 */
  variant?: 'icon' | 'panel';
  /** 收藏状态变更后的外部刷新回调 */
  onSuccess?: () => unknown | Promise<unknown>;
}
