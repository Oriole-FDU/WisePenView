/**
 * 个人中心「余额与使用量」（左下角入口）：展示个人钱包和各小组配额。
 * 两个区块直接铺在页面中，视觉边界由表格自身提供。
 */
import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import ComputeWallet from '@/views/app/_common/Wallet/ComputeWallet';
import { useTranslation } from 'react-i18next';
import QuotaByGroup from '../_components/QuotaByGroup';
import layout from '../style.module.less';

function Usage() {
  const { t } = useTranslation('profile');

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>{t('usage.title')}</h1>
        <span className={layout.pageSubtitle}>{t('usage.subtitle')}</span>
      </div>
      <div className={layout.usageContent}>
        <ComputeWallet targetType={WALLET_TARGET_TYPE.USER} canRecharge surface="plain" />
        <QuotaByGroup
          pagination={{
            defaultPageSize: 10,
          }}
        />
      </div>
    </div>
  );
}

export default Usage;
