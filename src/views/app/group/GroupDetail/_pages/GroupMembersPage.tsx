import { getGroupDisplayConfig } from '@/components/business/Group/GroupDisplayConfig';
import MemberList from '@/components/business/Group/MemberList';
import { useGroupContext } from '@/layouts/Group/GroupContext';

import layout from '../../style.module.less';

function GroupMembersPage() {
  const { group, currentUserRole } = useGroupContext();
  const displayConfig = getGroupDisplayConfig(group.groupType, currentUserRole);

  return (
    <div className={layout.tabPane}>
      <MemberList
        groupDisplayConfig={displayConfig}
        groupId={group.groupId}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
          showSizeChanger: true,
        }}
      />
    </div>
  );
}

export default GroupMembersPage;
