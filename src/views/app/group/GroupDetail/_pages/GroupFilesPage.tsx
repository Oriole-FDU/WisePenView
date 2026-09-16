import { useNavigate, useParams } from 'react-router-dom';

import TableDrive from '@/components/business/Drive/TableDrive';
import { getGroupDisplayConfig } from '@/components/business/Group/GroupDisplayConfig';
import { buildDriveNodeScope } from '@/domains/Drive';
import { useGroupContext } from '@/layouts/Group/GroupContext';
import { buildGroupFilesPath } from '@/utils/navigation/appRoute';

import layout from '../../style.module.less';
import page from '../style.module.less';

function GroupFilesPage() {
  const { group, currentUserRole } = useGroupContext();
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const displayConfig = getGroupDisplayConfig(group.groupType, currentUserRole);
  const scope = buildDriveNodeScope(group.groupId);

  const handleCurrentNodeChange = (nodeId: string) => {
    navigate(buildGroupFilesPath(group.groupId, nodeId === scope.rootId ? undefined : nodeId));
  };

  return (
    <div className={`${layout.tabPane} ${page.fileTabPane}`}>
      <TableDrive
        key={`${scope.rootId}\u0000${folderId ?? scope.rootId}`}
        scope={scope}
        initialNodeId={folderId}
        onCurrentNodeChange={handleCurrentNodeChange}
        onPathError={() => navigate(buildGroupFilesPath(group.groupId), { replace: true })}
        actions={{
          toolbar: {
            canCreateFolder: displayConfig.canCreateTag,
            canCreateNote: displayConfig.canCreateResource,
            canCreateDrawio: displayConfig.canCreateResource,
            canCreateSkill: displayConfig.canCreateResource,
            canCreateAgent: displayConfig.canCreateResource,
            canUploadToGroup: displayConfig.canUploadToGroup,
            canManageTagPermission: displayConfig.canManageTag,
          },
        }}
      />
    </div>
  );
}

export default GroupFilesPage;
