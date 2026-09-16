/**
 * 个人中心「余额与使用量」（左下角入口）：展示个人钱包和各小组配额。
 * 与外观页一致，使用表面卡片包裹内容区。
 */
import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import PageHeader from '@/layouts/_common/PageHeader';
import ComputeWallet from '@/views/app/_common/Wallet/ComputeWallet';

import QuotaByGroup from '../_components/QuotaByGroup';
import layout from '../style.module.less';

function Usage() {
  const { t } = useTranslation('profile');

  return (
    <>
      <PageHeader title={t('usage.title')} subtitle={t('usage.subtitle')} />
      <Card className={layout.usagePanel}>
        <Card.Content className={layout.usageContent}>
          <ComputeWallet targetType={WALLET_TARGET_TYPE.USER} canRecharge surface="plain" />
          <QuotaByGroup
            pagination={{
              defaultPageSize: 10,
            }}
          />
        </Card.Content>
      </Card>
    </>
  );
}

export default Usage;
