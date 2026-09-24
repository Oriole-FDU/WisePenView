import {
  WALLET_BUSINESS_TYPE,
  WALLET_TRANSACTION_KIND,
  type WalletTransactionKind,
  type WalletTransactionRecord,
} from '@/domains/Wallet';
import { normalizeFiniteNumber } from '@/utils/normalize/normalizeNumber';

import type {
  ListTransactionsApiRequest,
  ListTransactionsApiResponse,
  WalletBusinessTypeApiValue,
  WalletTransactionRecordApiResponse,
  WalletTransactionTypeApiValue,
} from '../apis/WalletApi.type';
import type {
  GetWalletInfoResponse,
  ListWalletTransactionsRequest,
  ListWalletTransactionsResponse,
  RedeemVoucherRequest,
  TransferTokenBetweenGroupAndUserRequest,
} from '../service/index.type';

const toNum = (value: unknown, fallback = 0): number => normalizeFiniteNumber(value) ?? fallback;

const mapTransactionTypeRawFromApi = (raw: unknown): unknown => {
  if (raw == null) return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const data = raw as Record<string, unknown>;
    // 兼容少量网关把 Java 枚举序列化为对象的情况，优先取 JsonValue。
    return data.value ?? data.name ?? data.code ?? data.desc;
  }
  return raw;
};

const mapTransactionTypeToKind = (raw: unknown): WalletTransactionKind => {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (upper === WALLET_TRANSACTION_KIND.REFILL) return WALLET_TRANSACTION_KIND.REFILL;
    if (upper === WALLET_TRANSACTION_KIND.SPEND) return WALLET_TRANSACTION_KIND.SPEND;
    if (upper === WALLET_TRANSACTION_KIND.TRANSFER_IN) {
      return WALLET_TRANSACTION_KIND.TRANSFER_IN;
    }
    if (upper === WALLET_TRANSACTION_KIND.TRANSFER_OUT) {
      return WALLET_TRANSACTION_KIND.TRANSFER_OUT;
    }
    if (upper === WALLET_TRANSACTION_KIND.INCOME) return WALLET_TRANSACTION_KIND.INCOME;
    if (upper === WALLET_TRANSACTION_KIND.EXCHANGE) return WALLET_TRANSACTION_KIND.EXCHANGE;
    if (upper === WALLET_TRANSACTION_KIND.REVERSE) return WALLET_TRANSACTION_KIND.REVERSE;
    if (upper === WALLET_TRANSACTION_KIND.GIFT) return WALLET_TRANSACTION_KIND.GIFT;
    if (upper === WALLET_TRANSACTION_KIND.ONLY_RECORD_META) {
      return WALLET_TRANSACTION_KIND.ONLY_RECORD_META;
    }
  }
  return WALLET_TRANSACTION_KIND.ONLY_RECORD_META;
};

const normalizeTransactionAmount = (type: WalletTransactionKind, count: number): number => {
  if (type === WALLET_TRANSACTION_KIND.ONLY_RECORD_META) return 0;
  if (type === WALLET_TRANSACTION_KIND.SPEND || type === WALLET_TRANSACTION_KIND.TRANSFER_OUT) {
    return -Math.abs(count);
  }
  return Math.abs(count);
};

const mapOperatorNameFromApi = (row: WalletTransactionRecordApiResponse): string | undefined => {
  const display = row.operatorDisplay;
  const name = display?.nickname ?? display?.realName ?? display?.username;
  if (name != null && String(name).trim().length > 0) return String(name);
  return undefined;
};

const mapTransactionRowFromApi = (
  row: WalletTransactionRecordApiResponse
): WalletTransactionRecord => {
  const type = mapTransactionTypeToKind(mapTransactionTypeRawFromApi(row.walletTransactionType));
  const amount = normalizeTransactionAmount(type, toNum(row.count, 0));

  return {
    traceId: String(row.traceId ?? ''),
    time: String(row.createTime ?? ''),
    type,
    amount,
    remark: row.meta != null && String(row.meta).length > 0 ? String(row.meta) : '',
    operatorName: mapOperatorNameFromApi(row),
  };
};

const mapGetUserWalletInfoFromApi = (data: Record<string, unknown>): GetWalletInfoResponse => {
  const tokenBalance = toNum(data.tokenBalance, 0);
  const tokenUsed = toNum(data.tokenUsed, 0);
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
  const transactionTypes = params.transactionTypes?.filter(
    (type): type is WalletTransactionTypeApiValue => WALLET_TRANSACTION_KIND.getKey(type) != null
  );
  const businessType = params.businessType;
  const walletBusinessType: WalletBusinessTypeApiValue | undefined =
    businessType != null && WALLET_BUSINESS_TYPE.getKey(businessType) != null
      ? businessType
      : undefined;

  return {
    page: params.page ?? 1,
    size: params.size ?? 20,
    ...(hasGroupId ? { groupId: String(groupId) } : {}),
    ...(transactionTypes != null && transactionTypes.length > 0
      ? { walletTransactionTypes: transactionTypes }
      : {}),
    ...(walletBusinessType != null ? { walletBusinessType } : {}),
  };
};

const mapListTransactionsFromApi = (
  data: ListTransactionsApiResponse
): ListWalletTransactionsResponse => {
  const rawList = data.list ?? [];
  const records = rawList.map(mapTransactionRowFromApi);

  return {
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
