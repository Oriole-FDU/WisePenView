import type { ListTransactionsApiRequest } from '@/domains/User/apis/UserApi.type';
import {
  WALLET_TOKEN_TX_TYPE,
  WALLET_TRANSACTION_KIND,
  type WalletTransactionKind,
  type WalletTransactionRecord,
} from '@/domains/Wallet';
import { normalizeFiniteNumber } from '@/utils/normalize/normalizeNumber';
import type {
  GetWalletInfoResponse,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from '../service/index.type';

const toNum = (value: unknown, fallback = 0): number => normalizeFiniteNumber(value) ?? fallback;

const mapTokenTransactionTypeRawFromApi = (raw: unknown): unknown => {
  if (raw == null) return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const data = raw as Record<string, unknown>;
    // fallback：部分网关会把枚举序列化成对象
    return data.code ?? data.value ?? data.name ?? data.desc;
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
  const numericValue = Number(raw);
  if (numericValue === 1) return WALLET_TRANSACTION_KIND.RECHARGE;
  if (numericValue === 2) return WALLET_TRANSACTION_KIND.SPEND;
  if (numericValue === 3) return WALLET_TRANSACTION_KIND.TRANSFER_IN;
  if (numericValue === 4) return WALLET_TRANSACTION_KIND.TRANSFER_OUT;
  // fallback：缺失交易类型时按金额正负推断展示分类
  if (tokenCount > 0) return WALLET_TRANSACTION_KIND.RECHARGE;
  // fallback：缺失交易类型且非正数时按消费展示
  return WALLET_TRANSACTION_KIND.SPEND;
};

const mapOperatorNameFromApi = (row: Record<string, unknown>): string | undefined => {
  const direct =
    row.operatorName != null && String(row.operatorName).trim().length > 0
      ? String(row.operatorName)
      : '';
  if (direct) return direct;
  const display = row.operatorDisplay;
  if (display != null && typeof display === 'object' && !Array.isArray(display)) {
    const data = display as Record<string, unknown>;
    // fallback：兼容旧接口 operatorDisplay 内不同用户名字段
    const name = data.nickname ?? data.nickName ?? data.userName ?? data.username;
    if (name != null && String(name).trim().length > 0) return String(name);
  }
  return undefined;
};

const mapTransactionRowFromApi = (row: Record<string, unknown>): WalletTransactionRecord => {
  // fallback：兼容旧接口 amount 字段
  const amount = toNum(row.tokenCount ?? row.amount, 0);
  const rawType =
    row.tokenTransactionType ??
    row.TokenTransactionType ??
    row.token_transaction_type ??
    row.changeType;
  const normalizedType = mapTokenTransactionTypeRawFromApi(rawType);
  const hasType =
    normalizedType !== undefined && normalizedType !== null && String(normalizedType) !== '';
  const type = hasType
    ? mapTokenTransactionTypeToKind(normalizedType, amount)
    : mapTokenTransactionTypeToKind(row.changeType, amount);
  // fallback：兼容旧接口 time/createdAt 字段
  const time = String(row.createTime ?? row.time ?? row.createdAt ?? '');
  const titleFromApi =
    row.title != null && String(row.title).trim().length > 0 ? String(row.title) : '';
  const subTitleFromMeta = row.meta != null && String(row.meta).length > 0 ? String(row.meta) : '';
  const subTitleFromLegacy =
    row.subTitle != null && String(row.subTitle).length > 0
      ? String(row.subTitle)
      : String(row.subtitle ?? '');

  return {
    // fallback：兼容旧接口 id 字段
    traceId: String(row.traceId ?? row.id ?? ''),
    time,
    type,
    amount,
    title: titleFromApi,
    subTitle: subTitleFromMeta || subTitleFromLegacy,
    operatorName: mapOperatorNameFromApi(row),
  };
};

const mapGetUserWalletInfoFromApi = (data: Record<string, unknown>): GetWalletInfoResponse => {
  const tokenBalance = toNum(
    // fallback：兼容旧接口大小写和 balance 字段
    data.tokenBalance ?? data.TokenBalance ?? data.balance ?? data.Balance,
    0
  );
  // fallback：兼容旧接口 TokenUsed 字段
  const tokenUsed = toNum(data.tokenUsed ?? data.TokenUsed, 0);
  return { tokenBalance, tokenUsed, balance: tokenBalance };
};

const mapRedeemVoucherRequest = (params: RedeemVoucherRequest): { voucherCode: string } => ({
  voucherCode: params.voucherCode,
});

const mapListTransactionsRequest = (
  params: ListWalletTransactionsRequest
): ListTransactionsApiRequest => {
  const groupId = params.groupId;
  const hasGroupId = groupId != null && groupId !== '';
  const typeName =
    params.type !== undefined && params.type !== null
      ? WALLET_TOKEN_TX_TYPE.getKey(params.type)
      : undefined;

  return {
    // fallback：未传分页时使用钱包页默认第一页
    page: params.page ?? 1,
    // fallback：未传分页大小时使用钱包页默认 20
    size: params.size ?? 20,
    // 不传 groupId：空值表示查询个人流水
    ...(hasGroupId ? { groupId: String(groupId) } : {}),
    // 不传 type：全部流水；无法映射枚举名时也省略，避免后端 400
    ...(typeName != null ? { type: typeName } : {}),
  };
};

const mapListTransactionsFromApi = (
  data: Record<string, unknown>
): ListWalletTransactionsResponse => {
  // fallback：兼容旧分页字段 records
  const rawList = data.list ?? data.records ?? [];
  const list = Array.isArray(rawList) ? rawList : [];
  const records = list
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map(mapTransactionRowFromApi);

  return {
    // fallback：缺失 total 时使用当前记录数
    total: toNum(data.total, records.length),
    records,
  };
};

const mapTransferTokenBetweenGroupAndUserRequest = (
  params: TransferTokenBetweenGroupAndUserRequest
) => ({
  groupId: String(params.groupId),
  tokenCount: params.tokenCount,
  tokenTransferType: params.tokenTransferType,
});

export const WalletServicesMap = {
  mapGetUserWalletInfoFromApi,
  mapRedeemVoucherRequest,
  mapListTransactionsRequest,
  mapListTransactionsFromApi,
  mapTransferTokenBetweenGroupAndUserRequest,
};
