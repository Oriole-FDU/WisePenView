import type { WalletTargetType } from '@/domains/Wallet';

export interface ComputeWalletRef {
  /** 显式刷新余额与当前页流水 */
  refresh: () => Promise<void>;
}

/**
 * 通用钱包组件 Props（个人中心 + 高级组 token明细 复用同一套 UI）。
 */
export interface ComputeWalletProps {
  /** 资金主体：USER 个人 / GROUP 小组 */
  targetType: WalletTargetType;

  /**
   * 小组为 groupId（string，防大数精度丢失），用于 getUserWalletInfo / listTransactions 的 query。
   * USER 场景可不传 groupId（接口查当前用户）。
   */
  targetId?: string;
  /**
   * 是否展示「充值」入口（redeemVoucher 仅给当前登录用户兑换；小组池不能直接点卡充值）。
   * 个人中心为 true；小组 token 明细恒为 false，组内算力由组长个人账户划入（见 token 划拨）。
   */
  canRecharge: boolean;
  /** 有「充值」按钮时可选，用于弹窗标题；小组场景不传 */
  groupDisplayName?: string;
  /**
   * 是否在表格增加「操作人」列。
   * 小组组长查看组账户流水时打开，用于展示充值人/消费人；个人钱包一般关闭。
   */
  showOperatorColumn?: boolean;
  /**
   * `card`：独立卡片（小组详情等）；`plain`：无外层卡片，由父级统一铺底（个人「余额与使用量」与外层 formSection 合一，避免叠两层）。
   */
  surface?: 'card' | 'plain';
}
