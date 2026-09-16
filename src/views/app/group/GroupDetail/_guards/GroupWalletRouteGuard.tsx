import { Outlet, useOutletContext } from 'react-router-dom';

import { getGroupDisplayConfig } from '@/components/business/Group/GroupDisplayConfig';
import { useGroupContext } from '@/layouts/Group/GroupContext';
import ForbiddenRoute from '@/views/app/error/ForbiddenRoute';

import type { GroupDetailOutletContextValue } from '..';

function GroupWalletRouteGuard() {
  const { group, currentUserRole } = useGroupContext();
  const outletContext = useOutletContext<GroupDetailOutletContextValue>();
  const displayConfig = getGroupDisplayConfig(group.groupType, currentUserRole);
  return displayConfig.showWalletTabs ? <Outlet context={outletContext} /> : <ForbiddenRoute />;
}

export default GroupWalletRouteGuard;
