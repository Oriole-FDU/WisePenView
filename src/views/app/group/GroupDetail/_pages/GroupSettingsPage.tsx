import { useGroupContext } from '@/views/app/group/GroupRoute/_context';

import GroupDescriptionSettings from '../_components/GroupDescriptionSettings';

function GroupSettingsPage() {
  const { group, groupResConfig, currentUserRole, refreshGroup } = useGroupContext();
  return (
    <GroupDescriptionSettings
      key={group.groupId}
      group={group}
      groupId={group.groupId}
      groupResConfig={groupResConfig}
      currentUserRole={currentUserRole}
      onRefresh={refreshGroup}
    />
  );
}

export default GroupSettingsPage;
