export interface OwnerGroupTokenTransferProps {
  groupId: string;
  /** 划拨成功后回调（可选，用于联动刷新其它区块） */
  onTransferSuccess?: () => void;
}
