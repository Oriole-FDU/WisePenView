import { useOutletContext } from 'react-router-dom';

import { useGroupContext } from '@/views/app/group/GroupRoute/_context';

import OwnerGroupTokenTransfer from '../../_components/OwnerGroupTokenTransfer';
import layout from '../../style.module.less';
import type { GroupDetailOutletContextValue } from '..';

function GroupTokenTransferPage() {
  const { group } = useGroupContext();
  const { refreshWallet } = useOutletContext<GroupDetailOutletContextValue>();
  return (
    <div className={layout.tabPane}>
      <OwnerGroupTokenTransfer groupId={group.groupId} onTransferSuccess={refreshWallet} />
    </div>
  );
}

export default GroupTokenTransferPage;
