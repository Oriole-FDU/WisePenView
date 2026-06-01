/**
 * 钱包 Service：/user/wallet/*，成功码与全局一致 `code === 200`。
 */
import {
  WALLET_TOKEN_TX_TYPE,
  WALLET_TRANSACTION_KIND,
  WALLET_TX_TAB_MERGE_FETCH_CAP,
  type WalletTransactionKind,
  type WalletTransactionRecord,
} from '@/domains/Wallet';
import { UserWalletApi } from '../apis/UserApi';
import type {
  GetWalletInfoResponse,
  IWalletService,
  ListMergedWalletTransactionsRequest,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from './index.type';

const toNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** 部分网关/序列化会把枚举落成对象，统一取出可映射字段 */
const normalizeTokenTransactionTypeRaw = (raw: unknown): unknown => {
  if (raw == null) return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return o.code ?? o.value ?? o.name ?? o.desc;
  }
  return raw;
};

const mapTokenTransactionTypeToKind = (raw: unknown, tokenCount: number): WalletTransactionKind => {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (upper === 'REFILL') return WALLET_TRANSACTION_KIND.RECHARGE;
    if (upper === 'SPEND') return WALLET_TRANSACTION_KIND.SPEND;
    if (upper === 'TRANSFER_IN') return WALLET_TRANSACTION_KIND.TRANSFER_IN;
    if (upper === 'TRANSFER_OUT') return WALLET_TRANSACTION_KIND.TRANSFER_OUT;
  }
  const n = Number(raw);
  if (n === 1) return WALLET_TRANSACTION_KIND.RECHARGE;
  if (n === 2) return WALLET_TRANSACTION_KIND.SPEND;
  if (n === 3) return WALLET_TRANSACTION_KIND.TRANSFER_IN;
  if (n === 4) return WALLET_TRANSACTION_KIND.TRANSFER_OUT;
  if (tokenCount > 0) return WALLET_TRANSACTION_KIND.RECHARGE;
  if (tokenCount < 0) return WALLET_TRANSACTION_KIND.SPEND;
  return WALLET_TRANSACTION_KIND.SPEND;
};

const operatorNameFromRow = (row: Record<string, unknown>): string | undefined => {
  const direct =
    row.operatorName != null && String(row.operatorName).trim().length > 0
      ? String(row.operatorName)
      : '';
  if (direct) return direct;
  const disp = row.operatorDisplay;
  if (disp != null && typeof disp === 'object' && !Array.isArray(disp)) {
    const o = disp as Record<string, unknown>;
    const nick = o.nickname ?? o.nickName ?? o.userName ?? o.username;
    if (nick != null && String(nick).trim().length > 0) return String(nick);
  }
  return undefined;
};

/** list 项：tokenTransactionType、tokenCount、meta、createTime 等 */
const mapTransactionRow = (row: Record<string, unknown>): WalletTransactionRecord => {
  const amountNum = toNum(row.tokenCount ?? row.amount, 0);
  const rawTx =
    row.tokenTransactionType ??
    row.TokenTransactionType ??
    row.token_transaction_type ??
    row.changeType;
  const normalizedTx = normalizeTokenTransactionTypeRaw(rawTx);
  const hasTxType =
    normalizedTx !== undefined && normalizedTx !== null && String(normalizedTx) !== '';
  const kind = hasTxType
    ? mapTokenTransactionTypeToKind(normalizedTx, amountNum)
    : mapTokenTransactionTypeToKind(row.changeType, amountNum);
  const time = String(row.createTime ?? row.time ?? row.createdAt ?? '');
  const titleFromApi =
    row.title != null && String(row.title).trim().length > 0 ? String(row.title) : '';
  const title = titleFromApi || WALLET_TRANSACTION_KIND.getLabel(kind);
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
    operatorName: operatorNameFromRow(row),
  };
};

const getUserWalletInfo = async (): Promise<GetWalletInfoResponse> => {
  const data = (await UserWalletApi.getUserWalletInfo()) ?? {};
  const tokenBalance = toNum(
    data.tokenBalance ?? data.TokenBalance ?? data.balance ?? data.Balance,
    0
  );
  const tokenUsed = toNum(data.tokenUsed ?? data.TokenUsed, 0);
  return { tokenBalance, tokenUsed, balance: tokenBalance };
};

const redeemVoucher = async (params: RedeemVoucherRequest): Promise<void> => {
  await UserWalletApi.redeemVoucher({
    voucherCode: params.voucherCode,
  });
};

const listTransactions = async (
  params: ListWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    size: params.size ?? 20,
  };
  const gid = params.groupId;
  if (gid != null && gid !== '') {
    query.groupId = String(gid);
  }
  if (params.type !== undefined && params.type !== null) {
    // Spring 对枚举 Query 一般按枚举名绑定，传数字会 400。
    const typeName = WALLET_TOKEN_TX_TYPE.getKey(params.type);
    if (typeName != null) {
      query.type = typeName;
    }
  }
  const data = (await UserWalletApi.listTransactions(
    query as Record<string, string | number>
  )) as Record<string, unknown>;
  const rawList = data.list ?? data.records ?? [];
  const list = Array.isArray(rawList) ? rawList : [];
  const records = list
    .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
    .map((r) => mapTransactionRow(r));
  return { total: toNum(data.total, records.length), records };
};

const txRecordDedupeKey = (r: WalletTransactionRecord): string =>
  r.traceId.length > 0 ? r.traceId : `${r.time}\u0000${r.type}\u0000${r.amount}`;

const compareWalletTxTimeDesc = (a: WalletTransactionRecord, b: WalletTransactionRecord): number =>
  String(b.time).localeCompare(String(a.time));

const listMergedTransactions = async (
  params: ListMergedWalletTransactionsRequest
): Promise<ListWalletTransactionsResponse> => {
  const { groupId, page = 1, size = 20, typeA, typeB } = params;
  const cap = WALLET_TX_TAB_MERGE_FETCH_CAP;
  const [ra, rb] = await Promise.all([
    listTransactions({ groupId, page: 1, size: cap, type: typeA }),
    listTransactions({ groupId, page: 1, size: cap, type: typeB }),
  ]);
  const map = new Map<string, WalletTransactionRecord>();
  for (const r of ra.records) map.set(txRecordDedupeKey(r), r);
  for (const r of rb.records) map.set(txRecordDedupeKey(r), r);
  const merged = [...map.values()].sort(compareWalletTxTimeDesc);
  const total = ra.total + rb.total;
  const start = (page - 1) * size;
  return { total, records: merged.slice(start, start + size) };
};

const transferTokenBetweenGroupAndUser = async (
  params: TransferTokenBetweenGroupAndUserRequest
): Promise<void> => {
  await UserWalletApi.transferTokenBetweenGroupAndUser({
    groupId: String(params.groupId),
    tokenCount: params.tokenCount,
    tokenTransferType: params.tokenTransferType,
  });
};

export const createWalletServices = (): IWalletService => ({
  getUserWalletInfo,
  redeemVoucher,
  listTransactions,
  listMergedTransactions,
  transferTokenBetweenGroupAndUser,
});
