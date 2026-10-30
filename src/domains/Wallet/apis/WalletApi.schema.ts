import { z } from 'zod';

import {
  createPageResponseSchema,
  EpochMillisSchema,
  JavaLongIdSchema,
  NonBlankStringSchema,
  NullableStringSchema,
  PageApiRequestSchema,
} from '@/apis/schema';
import { UserDisplayApiSchema } from '@/domains/User/apis/UserInformationApi.schema';

export const WalletTransactionTypeApiSchema = z.enum([
  'REFILL',
  'SPEND',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INCOME',
  'EXCHANGE',
  'REVERSE',
  'GIFT',
  'ONLY_RECORD_META',
]);

export const WalletBusinessTypeApiSchema = z.enum(['TOKEN', 'COIN']);

export const TokenTransferTypeApiSchema = z.enum(['GROUP_INFLOW', 'USER_INFLOW']);

export const GetUserWalletInfoApiResponseSchema = z.object({
  tokenUsed: z.number().int().nonnegative(),
  tokenBalance: z.number().int().nonnegative(),
  coinBalance: z.number().int().nonnegative(),
});

export const RedeemVoucherApiRequestSchema = z.strictObject({
  voucherCode: NonBlankStringSchema,
});

export const WalletTransactionRecordApiSchema = z.object({
  traceId: NullableStringSchema,
  operatorId: JavaLongIdSchema.nullable(),
  count: z.number().int().nullable(),
  walletTransactionType: WalletTransactionTypeApiSchema.nullable(),
  walletBusinessType: WalletBusinessTypeApiSchema.nullable(),
  meta: NullableStringSchema,
  billingDetail: NullableStringSchema,
  operatorDisplay: UserDisplayApiSchema.nullable(),
  createTime: EpochMillisSchema,
});

export const ListTransactionsApiRequestSchema = PageApiRequestSchema.extend({
  groupId: JavaLongIdSchema.optional(),
  walletTransactionTypes: z.array(WalletTransactionTypeApiSchema).optional(),
  walletBusinessType: WalletBusinessTypeApiSchema.optional(),
});

export const ListTransactionsApiResponseSchema = createPageResponseSchema(
  WalletTransactionRecordApiSchema
);

export const TransferTokenBetweenGroupAndUserApiRequestSchema = z.strictObject({
  groupId: JavaLongIdSchema,
  tokenCount: z.number().int().positive(),
  tokenTransferType: TokenTransferTypeApiSchema,
});

export type WalletTransactionTypeApiValue = z.infer<typeof WalletTransactionTypeApiSchema>;
export type WalletBusinessTypeApiValue = z.infer<typeof WalletBusinessTypeApiSchema>;
export type TokenTransferTypeApiValue = z.infer<typeof TokenTransferTypeApiSchema>;
export type GetUserWalletInfoApiResponse = z.infer<typeof GetUserWalletInfoApiResponseSchema>;
export type RedeemVoucherApiRequest = z.infer<typeof RedeemVoucherApiRequestSchema>;
export type WalletTransactionRecordApiResponse = z.infer<typeof WalletTransactionRecordApiSchema>;
export type ListTransactionsApiRequest = z.infer<typeof ListTransactionsApiRequestSchema>;
export type ListTransactionsApiResponse = z.infer<typeof ListTransactionsApiResponseSchema>;
export type TransferTokenBetweenGroupAndUserApiRequest = z.infer<
  typeof TransferTokenBetweenGroupAndUserApiRequestSchema
>;
