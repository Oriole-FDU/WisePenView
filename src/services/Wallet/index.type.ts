import type { WalletTransactionRecord } from '@/types/wallet';

/**
 * IWalletService：计算点余额、点卡核销、交易明细分页。
 * 实现类禁止被组件直接 import，统一通过 useWalletService() 注入。
 */

/** GET /group/member/getWalletInfo */
export interface GetWalletInfoRequest {
  /** 见 constants/wallet WALLET_TARGET_TYPE */
  targetType: number;
  /** 用户 id 或小组 id（大数场景下可用 string 传参，避免精度问题） */
  targetId: string | number;
}

/**
 * 与接口 data 对齐：tokenBalance / tokenUsed。
 * balance 与 tokenBalance 同值，供展示「当前可用计算点」时直接使用。
 */
export interface GetWalletInfoResponse {
  tokenBalance: number;
  tokenUsed: number;
  /** 等于 tokenBalance，便于组件统一用 balance 展示余量 */
  balance: number;
}

/** POST /group/member/redeemVoucher —— 成功时 data 为 null，无业务载荷 */
export interface RedeemVoucherRequest {
  targetType: number;
  targetId: string | number;
  /** 已剔除横杠与空格后的 16 位纯字符（大写），由前端在提交前规范化 */
  code: string;
}

/** GET /group/member/getTransactions */
export interface ListWalletTransactionsRequest {
  targetType: number;
  targetId: string | number;
  page?: number;
  size?: number;
  /**
   * 流水类型：0 全部；1 充值；2 消费。
   * 未传时由实现层默认 0。
   */
  type?: 0 | 1 | 2;
}

/**
 * 领域层分页结果。接口 data 另有 page、size、totalPage；列表仅使用 list。
 */
export interface ListWalletTransactionsResponse {
  total: number;
  records: WalletTransactionRecord[];
}

/**
 * POST /group/member/giveTokenToGroup
 * 将当前用户个人 Token 划转到指定小组池（与点卡兑换码 redeemVoucher 不同）。
 */
export interface GiveTokenToGroupRequest {
  groupId: string | number;
  amount: number;
}

/**
 * POST /group/member/giveTokenToOwner
 * 将小组池 Token 划转回组长个人账户等业务语义由后端定义（与兑换码无关）。
 */
export interface GiveTokenToOwnerRequest {
  groupId: string | number;
  amount: number;
}

export interface IWalletService {
  getWalletInfo(params: GetWalletInfoRequest): Promise<GetWalletInfoResponse>;
  redeemVoucher(params: RedeemVoucherRequest): Promise<void>;
  listTransactions(params: ListWalletTransactionsRequest): Promise<ListWalletTransactionsResponse>;
  giveTokenToGroup(params: GiveTokenToGroupRequest): Promise<void>;
  giveTokenToOwner(params: GiveTokenToOwnerRequest): Promise<void>;
}
