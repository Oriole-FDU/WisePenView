# Wallet 业务知识

> Canonical owner：`src/domains/Wallet`

## 范围

本文档维护个人钱包、小组资金池入口、点卡兑换、组长划拨与钱包流水。小组资金池余额由 [Group](../Group/BUSINESS.md) 的小组详情读取；角色展示边界见 Group。

## 余额、兑换与划拨

- `getUserWalletInfo()` 无参数，只读取当前用户个人钱包；小组资金池余额由 `groupService.getGroupWalletInfo({ groupId })` 读取。个人余额接口不接受 `groupId`。依据：[WalletApi](apis/WalletApi.ts)、[GroupServices](../Group/service/GroupServices.impl.ts)、[ComputeWallet](../../components/business/Wallet/ComputeWallet/index.tsx)。
- `redeemVoucher()` 只带 voucher code，不接收用户或小组标识；当前钱包界面只在个人主体显示兑换入口，小组池没有点卡直接充值入口。依据：[Wallet service types](service/index.type.ts)、[ComputeWallet](../../components/business/Wallet/ComputeWallet/index.tsx)。
- 组长与小组间划拨使用独立接口：`GROUP_INFLOW` 表示个人资金转入小组，`USER_INFLOW` 表示从小组转回组长。小组页面会读取两侧余额并在提交前检查正数与当前余额；这些前端检查不证明后端对金额或操作者的授权规则。依据：[Wallet enum](enum/index.ts)、[划拨页面](../../views/app/group/_components/OwnerGroupTokenTransfer/index.tsx)。

## 流水筛选与金额

- `listTransactions()` 无 `groupId` 时查个人流水，有值时查对应小组流水；默认 page 为 1、size 为 20。`transactionTypes` 与 `businessType` 可选；mapper 仅发送已知交易类型与业务类型，空的有效类型集合不生成类型筛选参数。依据：[WalletServicesMap](mapper/WalletServices.map.ts)、[WalletApi](apis/WalletApi.ts)。
- 已知的 `ONLY_RECORD_META` 金额固定为 0；未知类型先映射为 `ONLY_RECORD_META`，金额同样为 0，不能将这两类记录当作消费或收入。`SPEND` 与 `TRANSFER_OUT` 按绝对值取负，其余已知类型取绝对值。依据：[mapTransactionTypeToKind、normalizeTransactionAmount](mapper/WalletServices.map.ts)、[WALLET_TRANSACTION_KIND](entity/wallet.ts)。
