import { AppButton } from '@/components/Button';
import AppIconButton from '@/components/Button/AppIconButton';
import { useGroupService } from '@/domains';
import { buildDriveNodeScope } from '@/domains/Drive';
import type { Group } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import { useSidebarDriveScopeStore } from '@/layouts/_common/Sidebar/DriveSidebar/_store/useSidebarDriveScopeStore';
import { Dropdown, Header, Label } from '@heroui/react';
import { ChevronsUpDown, HardDrive } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './style.module.less';

const PERSONAL_SCOPE_KEY = '__personal__';
const GROUP_SCOPE_PAGE_SIZE = 20;

function SidebarDriveScopeSwitcher() {
  const { t } = useTranslation('drive');
  const groupService = useGroupService();
  const activeScope = useSidebarDriveScopeStore((state) => state.scope);
  const setScope = useSidebarDriveScopeStore((state) => state.setScope);
  const [open, setOpen] = useState(false);
  const [groupPage, setGroupPage] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTotalPage, setGroupTotalPage] = useState(1);
  const selectedKey = activeScope.type === 'group' ? activeScope.groupId : PERSONAL_SCOPE_KEY;

  const { loading } = useApi(
    () =>
      groupService.fetchGroupList({
        groupRoleFilter: 'ALL',
        page: groupPage,
        size: GROUP_SCOPE_PAGE_SIZE,
      }),
    {
      refreshDeps: [groupPage],
      onSuccess: (result) => {
        setGroups((current) =>
          result.page === 1 ? result.groups : [...current, ...result.groups]
        );
        setGroupTotalPage(result.totalPage);
      },
      getErrorMessage: () => t('sidebar.loadGroupsFailed'),
    }
  );
  const hasMoreGroups = groupPage < groupTotalPage;

  const handleSelectScope = (nextGroupId?: string): void => {
    setScope(buildDriveNodeScope(nextGroupId));
    setOpen(false);
  };

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <AppIconButton
        icon={<ChevronsUpDown size={14} aria-hidden="true" />}
        label={t('sidebar.switchScope')}
        size="sm"
        className={styles.nodeActionBtn}
        tooltip={{ content: t('sidebar.switchDrive') }}
        overlayTrigger={<Dropdown.Trigger />}
      />
      <Dropdown.Popover className={styles.scopeMenuPanel} placement="right">
        <Dropdown.Menu
          aria-label={t('sidebar.switchScope')}
          className={styles.scopeList}
          selectionMode="single"
          selectedKeys={[selectedKey]}
          onAction={(key) =>
            handleSelectScope(key === PERSONAL_SCOPE_KEY ? undefined : String(key))
          }
        >
          <Dropdown.Section>
            <Header>{t('sidebar.switchDrive')}</Header>
            <Dropdown.Item id={PERSONAL_SCOPE_KEY} textValue={t('sidebar.personalDrive')}>
              <HardDrive size={15} aria-hidden="true" />
              <Label>{t('sidebar.personalDrive')}</Label>
              <Dropdown.ItemIndicator type="dot" />
            </Dropdown.Item>
            {groups.map((group) => (
              <Dropdown.Item
                key={group.groupId}
                id={group.groupId}
                textValue={group.groupName || t('navigator.unnamedGroup')}
              >
                <HardDrive size={15} aria-hidden="true" />
                <Label>{group.groupName || t('navigator.unnamedGroup')}</Label>
                <Dropdown.ItemIndicator type="dot" />
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
        </Dropdown.Menu>
        {hasMoreGroups ? (
          <AppButton
            size="sm"
            variant="ghost"
            className={styles.scopeLoadMoreButton}
            isDisabled={loading}
            onPress={() => setGroupPage((page) => page + 1)}
          >
            {loading ? t('sidebar.loadingGroups') : t('sidebar.loadMoreGroups')}
          </AppButton>
        ) : null}
        {loading ? <div className={styles.scopeHint}>{t('sidebar.loadingGroups')}</div> : null}
        {!loading && groups.length === 0 ? (
          <div className={styles.scopeHint}>{t('sidebar.noGroups')}</div>
        ) : null}
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default SidebarDriveScopeSwitcher;
