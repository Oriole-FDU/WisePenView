export interface CollectionPickerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 操作的资源 ID */
  resourceId: string;
  /** 打开时的初始已选集合 ID 列表 */
  initialCollectionIds: string[];
  /** 确认操作后的回调（传入最新 collectionIds，空数组表示全部取消收藏） */
  onConfirmed: (collectionIds: string[]) => void;
}
