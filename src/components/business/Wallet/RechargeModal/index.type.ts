/**
 * 点卡兑换弹窗：输入 xxxx-xxxx-xxxx-xxxx，提交 16 位无分隔大写串给后端。
 */
export interface RechargeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** 有值时弹窗标题带名称（预留）；当前仅个人点卡兑换，小组不支持充值 */
  groupDisplayName?: string;
  /**
   * 提交兑换码。成功时应由父组件刷新余额/流水；失败须 throw，以便弹窗保持打开并展示错误。
   */
  onSubmit: (code: string) => Promise<void>;
}
