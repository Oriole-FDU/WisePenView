/**
 * 点卡兑换弹窗：输入 xxxx-xxxx-xxxx-xxxx，提交 16 位无分隔大写串给后端。
 */
export interface RechargeModalProps {
  open: boolean;
  onCancel: () => void;
  /** 有值时标题为小组充值样式；无值为个人充值 */
  groupDisplayName?: string;
  /**
   * 提交兑换码。成功时应由父组件刷新余额/流水；失败须 throw，以便弹窗保持打开并展示错误。
   */
  onSubmit: (code: string) => Promise<void>;
}
