export interface ResourceFavoriteActionProps {
  resourceId: string;
  onSuccess?: () => unknown | Promise<unknown>;
  showLabel?: boolean;
}
