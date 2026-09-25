import { useOutletContext } from 'react-router-dom';

import ComputeWallet from '@/components/business/Wallet/ComputeWallet';
import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import { useGroupContext } from '@/views/app/group/GroupRoute/GroupContext';

import layout from '../../style.module.less';
import type { GroupDetailOutletContextValue } from '..';

function GroupWalletPage() {
  const { group } = useGroupContext();
  const { walletRefreshVersion } = useOutletContext<GroupDetailOutletContextValue>();
  return (
    <div className={layout.tabPane}>
      <ComputeWallet
        targetType={WALLET_TARGET_TYPE.GROUP}
        targetId={group.groupId}
        canRecharge={false}
        showOperatorColumn
        refreshVersion={walletRefreshVersion}
      />
    </div>
  );
}

export default GroupWalletPage;
