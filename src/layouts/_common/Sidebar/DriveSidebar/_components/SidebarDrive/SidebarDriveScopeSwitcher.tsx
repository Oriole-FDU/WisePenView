import { Popover } from '@/components/Overlay';
import { useGroupService } from '@/domains';
import { buildDriveNodeScope } from '@/domains/Drive';
import type { Group } from '@/domains/Group';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, ChevronsUpDown, HardDrive, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './style.module.less';

const PERSONAL_SCOPE_KEY = '__personal__';
const GROUP_SCOPE_PAGE_SIZE = 100;

function SidebarDriveScopeSwitcher() {
  const groupService = useGroupService();
  const activeScope = useWorkspaceNavigationStore((state) => state.location.scope);
  const navigateToScope = useWorkspaceNavigationStore((state) => state.navigateToScope);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const selectedKey = activeScope.type === 'group' ? activeScope.groupId : PERSONAL_SCOPE_KEY;

  const { data: groups = [], loading } = useRequest(
    async (): Promise<Group[]> => {
      const [joinedGroups, managedGroups] = await Promise.all([
        groupService.fetchGroupList({
          groupRoleFilter: 'JOINED',
          page: 1,
          size: GROUP_SCOPE_PAGE_SIZE,
        }),
        groupService.fetchGroupList({
          groupRoleFilter: 'MANAGED',
          page: 1,
          size: GROUP_SCOPE_PAGE_SIZE,
        }),
      ]);
      return mergeScopeGroups([...joinedGroups.groups, ...managedGroups.groups]);
    },
    {
      onError: () => {
        toast.danger('获取小组列表失败');
      },
    }
  );

  const handleSelectScope = (nextGroupId?: string): void => {
    navigateToScope(buildDriveNodeScope(nextGroupId));
    if (nextGroupId) {
      navigate(`/app/drive?group=${encodeURIComponent(nextGroupId)}`);
    } else {
      navigate('/app/drive');
    }
    setOpen(false);
  };

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button type="button" className={styles.nodeActionBtn} aria-label="切换云盘范围">
          <ChevronsUpDown size={14} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Content className={styles.scopePopover} placement="right">
        <Popover.Dialog>
          <div
            className={styles.scopeMenuPanel}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className={styles.scopeMenuTitle}>切换云盘</div>
            <div role="menu" aria-label="切换云盘范围" className={styles.scopeList}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selectedKey === PERSONAL_SCOPE_KEY}
                className={styles.scopeMenuItem}
                onClick={() => handleSelectScope(undefined)}
              >
                <HardDrive size={15} aria-hidden="true" />
                <span className={styles.scopeMenuItemText}>个人云盘</span>
                {selectedKey === PERSONAL_SCOPE_KEY ? (
                  <Check size={14} className={styles.scopeCheckIcon} aria-hidden="true" />
                ) : null}
              </button>
              {groups.map((group) => (
                <button
                  key={group.groupId}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedKey === group.groupId}
                  className={styles.scopeMenuItem}
                  onClick={() => handleSelectScope(group.groupId)}
                >
                  <UsersRound size={15} aria-hidden="true" />
                  <span className={styles.scopeMenuItemText}>
                    {group.groupName || '未命名小组'}
                  </span>
                  {selectedKey === group.groupId ? (
                    <Check size={14} className={styles.scopeCheckIcon} aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
            {loading ? <div className={styles.scopeHint}>正在加载小组...</div> : null}
            {!loading && groups.length === 0 ? (
              <div className={styles.scopeHint}>暂无可切换小组</div>
            ) : null}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function mergeScopeGroups(groups: Group[]): Group[] {
  const groupMap = new Map<string, Group>();
  for (const group of groups) {
    if (!group.groupId || groupMap.has(group.groupId)) continue;
    groupMap.set(group.groupId, group);
  }
  return [...groupMap.values()];
}

export default SidebarDriveScopeSwitcher;
