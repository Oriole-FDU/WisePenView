/**
 * 钱包 Service 真实实现：对接 /group/member 下钱包相关接口。
 *
 * - 成功判定：`checkResponse`，即 `code === 200`。
 * - 点卡充值：`redeemVoucher`（兑换码）；非 `giveToken*`，后两者为按数额在个人账户与小组池之间划拨。
 * - getTransactions：data 为分页体 total/page/size/totalPage/list；项含 traceId、changeType、amount、meta、createTime 等。
 *   query 始终带 `type`，`0` 全部、`1` 充值、`2` 消费（未传时默认 `0`）。
 */
import Axios from '@/utils/Axios';
import { checkResponse } from '@/utils/response';
import type { ApiResponse } from '@/types/api';
import type { WalletTransactionKind, WalletTransactionRecord } from '@/types/wallet';
import type {
  GetWalletInfoRequest,
  GetWalletInfoResponse,
  RedeemVoucherRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  GiveTokenToGroupRequest,
  GiveTokenToOwnerRequest,
  IWalletService,
} from './index.type';

const toNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * 将接口原始 type 转为领域枚举（旧字段兼容）。
 * 兼容：'RECHARGE'/'SPEND'、数字 1/2、以及包含关键字的字符串。
 */
const mapTxKind = (raw: unknown): WalletTransactionKind => {
  if (raw === 'RECHARGE' || raw === 1 || raw === '1') return 'RECHARGE';
  if (raw === 'SPEND' || raw === 2 || raw === '2') return 'SPEND';
  const s = String(raw ?? '').toUpperCase();
  if (s.includes('RECHARGE') || s.includes('CHARGE')) return 'RECHARGE';
  return 'SPEND';
};

/**
 * changeType 与列表筛选 type 一致：1=充值/入账，2=消费/出账；
 * 未识别时按 amount 正负推断，再默认 SPEND。
 */
const mapChangeTypeToKind = (changeType: unknown, amountNum: number): WalletTransactionKind => {
  if (changeType === 1 || changeType === '1') return 'RECHARGE';
  if (changeType === 2 || changeType === '2') return 'SPEND';
  if (amountNum > 0) return 'RECHARGE';
  if (amountNum < 0) return 'SPEND';
  return 'SPEND';
};

const defaultTitleForKind = (k: WalletTransactionKind): string =>
  k === 'RECHARGE' ? '充值' : '消费';

/**
 * getTransactions 单条 list 项 → 领域记录。
 * 新字段：changeType、amount（可为字符串）、meta、createTime；仍兼容旧 title/type/time。
 */
const mapTransactionRow = (row: Record<string, unknown>): WalletTransactionRecord => {
  const amountNum = toNum(row.amount, 0);
  const hasChangeType = row.changeType !== undefined && row.changeType !== null;
  const kind = hasChangeType ? mapChangeTypeToKind(row.changeType, amountNum) : mapTxKind(row.type);
  const time = String(row.createTime ?? row.time ?? row.createdAt ?? '');
  const titleFromApi =
    row.title != null && String(row.title).trim().length > 0 ? String(row.title) : '';
  const title = titleFromApi || defaultTitleForKind(kind);
  const subFromMeta = row.meta != null && String(row.meta).length > 0 ? String(row.meta) : '';
  const subFromLegacy =
    row.subTitle != null && String(row.subTitle).length > 0
      ? String(row.subTitle)
      : String(row.subtitle ?? '');
  const subTitle = subFromMeta || subFromLegacy;
  return {
    traceId: String(row.traceId ?? row.id ?? ''),
    time,
    type: kind,
    amount: amountNum,
    title,
    subTitle,
    operatorName:
      row.operatorName != null && String(row.operatorName).trim().length > 0
        ? String(row.operatorName)
        : undefined,
  };
};

const getWalletInfo = async (params: GetWalletInfoRequest): Promise<GetWalletInfoResponse> => {
  const res = (await Axios.get('/group/member/getWalletInfo', {
    params: {
      targetType: params.targetType,
      targetId: params.targetId,
    },
  })) as ApiResponse<Record<string, unknown>>;
  checkResponse(res);
  const data = res.data ?? {};
  const tokenBalance = toNum(
    data.tokenBalance ?? data.TokenBalance ?? data.balance ?? data.Balance,
    0
  );
  const tokenUsed = toNum(data.tokenUsed ?? data.TokenUsed, 0);
  return {
    tokenBalance,
    tokenUsed,
    balance: tokenBalance,
  };
};

const redeemVoucher = async (params: RedeemVoucherRequest): Promise<void> => {
  const res = (await Axios.post('/group/member/redeemVoucher', {
    targetType: params.targetType,
    targetId: params.targetId,
    code: params.code,
  })) as ApiResponse<unknown>;
  checkResponse(res);
};

const listTransactions = async (
  params: ListWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const query: Record<string, string | number> = {
    targetType: params.targetType,
    targetId: params.targetId,
    page: params.page ?? 1,
    size: params.size ?? 20,
    /** 0 全部 / 1 充值 / 2 消费 */
    type: params.type ?? 0,
  };
  const res = (await Axios.get('/group/member/getTransactions', {
    params: query,
  })) as ApiResponse<Record<string, unknown>>;
  checkResponse(res);
  const data = (res.data ?? {}) as Record<string, unknown>;
  const rawList = data.list ?? data.records ?? [];
  const list = Array.isArray(rawList) ? rawList : [];
  const records = list
    .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
    .map((r) => mapTransactionRow(r));
  return { total: toNum(data.total, records.length), records };
};

const giveTokenToGroup = async (params: GiveTokenToGroupRequest): Promise<void> => {
  const res = (await Axios.post('/group/member/giveTokenToGroup', {
    groupId: params.groupId,
    amount: params.amount,
  })) as ApiResponse<unknown>;
  checkResponse(res);
};

const giveTokenToOwner = async (params: GiveTokenToOwnerRequest): Promise<void> => {
  const res = (await Axios.post('/group/member/giveTokenToOwner', {
    groupId: params.groupId,
    amount: params.amount,
  })) as ApiResponse<unknown>;
  checkResponse(res);
};

export const WalletServicesImpl: IWalletService = {
  getWalletInfo,
  redeemVoucher,
  listTransactions,
  giveTokenToGroup,
  giveTokenToOwner,
};
