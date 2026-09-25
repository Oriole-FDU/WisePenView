import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ServicesProvider } from '@/domains';
import {
  WALLET_TARGET_TYPE,
  WALLET_TRANSACTION_KIND,
  type WalletTransactionRecord,
} from '@/domains/Wallet';

import styles from './ComputeWallet.stories.module.less';
import ComputeWallet from './index';
import WalletBalanceHeader from './WalletBalanceHeader';
import WalletTransactionTable from './WalletTransactionTable';

const DEMO_TRANSACTIONS: WalletTransactionRecord[] = [
  {
    traceId: 'story-refill',
    time: '2026-09-19 12:48:10',
    type: WALLET_TRANSACTION_KIND.REFILL,
    amount: 12_500_000,
    remark: '****-****-****-8829',
    operatorName: '张三',
  },
  {
    traceId: 'story-transfer-out',
    time: '2026-09-19 12:40:18',
    type: WALLET_TRANSACTION_KIND.TRANSFER_OUT,
    amount: -3_200_000,
    remark: '转回组长账户',
    operatorName: '李四',
  },
  {
    traceId: 'story-spend',
    time: '2026-09-19 11:15:00',
    type: WALLET_TRANSACTION_KIND.SPEND,
    amount: -420_000,
    remark: 'GPT-4-Turbo',
    operatorName: '王五',
  },
  {
    traceId: 'story-record',
    time: '2026-09-19 10:02:33',
    type: WALLET_TRANSACTION_KIND.ONLY_RECORD_META,
    amount: 0,
    remark: '余额熔断状态更新',
    operatorName: '系统',
  },
];

function WalletProviderFrame({ group = false }: { group?: boolean }) {
  return (
    <ServicesProvider>
      <div className={styles.frame}>
        <ComputeWallet
          targetType={group ? WALLET_TARGET_TYPE.GROUP : WALLET_TARGET_TYPE.USER}
          targetId={group ? 'course-data-structures' : undefined}
          canRecharge={!group}
          showOperatorColumn={group}
        />
      </div>
    </ServicesProvider>
  );
}

const meta = {
  title: 'Wallet/ComputeWallet',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const PersonalWallet: Story = {
  render: () => <WalletProviderFrame />,
};

export const GroupWallet: Story = {
  render: () => <WalletProviderFrame group />,
};

export const MillionBalance: Story = {
  render: () => (
    <div className={styles.panel}>
      <WalletBalanceHeader balance={99_996_996} loading={false} canRecharge onRecharge={fn()} />
    </div>
  ),
};

export const TransactionStates: Story = {
  render: () => (
    <div className={styles.stack}>
      <WalletTransactionTable
        activeTab="all"
        records={DEMO_TRANSACTIONS}
        loading={false}
        flashFirstRow={false}
        showOperatorColumn
        current={1}
        total={DEMO_TRANSACTIONS.length}
        pageSize={20}
        onPageChange={fn()}
        onTabChange={fn()}
      />
    </div>
  ),
};
