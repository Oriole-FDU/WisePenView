/**
 * 钱包流水领域类型（与需求文档「获取交易流水」Output 及前端表格展示对齐）。
 */

/** 流水业务类型：充值（点卡）或消费（算力使用等） */
export type WalletTransactionKind = 'RECHARGE' | 'SPEND';

/**
 * 单条流水记录（Service 层由 getTransactions 的 list 项映射而来）。
 * 接口字段：traceId、changeType、amount（可为字符串）、meta、operatorName、createTime。
 * - title / subTitle：由 changeType 与 meta 等映射；展示用主副标题
 * - amount：正数为入账，负数为出账
 * - operatorName：小组流水等场景可选
 */
export interface WalletTransactionRecord {
  traceId: string;
  time: string;
  type: WalletTransactionKind;
  amount: number;
  title: string;
  subTitle: string;
  operatorName?: string;
}
