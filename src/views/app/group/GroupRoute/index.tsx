import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import { useGroupService } from '@/domains';
import type { Group, GroupResConfig } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import { GroupContext, type GroupCurrentUserRole } from '@/layouts/Group/GroupContext';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import styles from './style.module.less';

type GroupRouteLoaded = {
  group: Group;
  currentUserRole: GroupCurrentUserRole;
  groupResConfig: GroupResConfig;
};

function GroupRoute() {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const navigate = useNavigate();
  const { groupId = '' } = useParams<{ groupId: string }>();
  const { data, loading, error, refresh } = useApi(
    async (): Promise<GroupRouteLoaded> => {
      const [group, currentUserRole, groupResConfig] = await Promise.all([
        groupService.fetchGroupInfo(groupId),
        groupService.fetchMyRoleInGroup(groupId),
        groupService.fetchGroupResConfig(groupId),
      ]);
      return { group, currentUserRole, groupResConfig };
    },
    { ready: Boolean(groupId), refreshDeps: [groupId] }
  );

  if (loading) {
    return (
      <div className={styles.routeState}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.routeState}>
        <ResultState
          status="error"
          title={t('detail.loadFailed')}
          subTitle={error ? parseErrorMessage(error) : t('detail.notFound')}
          extra={
            <div className={styles.resultActions}>
              <AppButton variant="ghost" onPress={() => navigate(APP_ROUTE_PATH.GROUPS)}>
                <ArrowLeft size={16} aria-hidden />
                {t('detail.backToGroups')}
              </AppButton>
              <AppButton variant="primary" onPress={refresh}>
                {t('detail.retry')}
              </AppButton>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <GroupContext.Provider
      value={{
        group: data.group,
        currentUserRole: data.currentUserRole,
        groupResConfig: data.groupResConfig,
        refreshGroup: refresh,
      }}
    >
      <Outlet />
    </GroupContext.Provider>
  );
}

export default GroupRoute;
