/**
 * 钱包资金归属主体，对应 targetType。
 * - USER：个人账户（个人中心「余额与使用量」）
 * - GROUP：小组账户（高级组详情「token明细」，仅组长可操作充值与查看全量流水）
 */
export const WALLET_TARGET_TYPE = { USER: 1, GROUP: 2 } as const;
export type WalletTargetType = (typeof WALLET_TARGET_TYPE)[keyof typeof WALLET_TARGET_TYPE];

/**
 * getTransactions 的 type 参数约定（与后端对齐）：
 * - ALL(0)：全部流水
 * - RECHARGE(1)：仅充值
 * - SPEND(2)：仅消费
 */
export const WALLET_TX_LIST_FILTER = { ALL: 0, RECHARGE: 1, SPEND: 2 } as const;
export type WalletTxListFilter = (typeof WALLET_TX_LIST_FILTER)[keyof typeof WALLET_TX_LIST_FILTER];
