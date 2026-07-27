import type { Group, GroupResConfig } from '@/domains/Group';
import { Button } from '@heroui/react';
import { LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DissolveGroupModal, ExitGroupModal } from '../../../_components/GroupModals';
import GroupPermissionSection from '../GroupPermissionSection';
import GroupProfileSection from '../GroupProfileSection';
import GroupSettingsSection from '../GroupSettingsSection';
import styles from './style.module.less';

interface GroupDescriptionSettingsProps {
  group: Group;
  groupId: string;
  groupResConfig: GroupResConfig;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onRefresh: () => void;
}

function GroupDescriptionSettings({
  group,
  groupId,
  groupResConfig,
  currentUserRole,
  onRefresh,
}: GroupDescriptionSettingsProps) {
  const { t } = useTranslation('group');
  const [dissolveGroupModalOpen, setDissolveGroupModalOpen] = useState(false);
  const [exitGroupModalOpen, setExitGroupModalOpen] = useState(false);
  const canEditProfile = currentUserRole === 'OWNER';
  const canEditDefaultPermissions = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div className={styles.settings}>
      <GroupProfileSection
        group={group}
        groupId={groupId}
        canEdit={canEditProfile}
        onSuccess={onRefresh}
      />

      {canEditDefaultPermissions ? (
        <GroupPermissionSection
          groupId={groupId}
          groupResConfig={groupResConfig}
          onSuccess={onRefresh}
        />
      ) : null}

      <GroupSettingsSection title={t('settings.operations')}>
        <div className={styles.dangerAction}>
          {currentUserRole === 'OWNER' ? (
            <Button variant="danger" onPress={() => setDissolveGroupModalOpen(true)}>
              <Trash2 size={16} aria-hidden="true" />
              {t('dissolve.title')}
            </Button>
          ) : (
            <Button variant="danger" onPress={() => setExitGroupModalOpen(true)}>
              <LogOut size={16} aria-hidden="true" />
              {t('exit.title')}
            </Button>
          )}
        </div>
      </GroupSettingsSection>

      <DissolveGroupModal
        isOpen={dissolveGroupModalOpen}
        onOpenChange={setDissolveGroupModalOpen}
        groupName={group.groupName}
        groupId={groupId}
      />
      <ExitGroupModal
        isOpen={exitGroupModalOpen}
        onOpenChange={setExitGroupModalOpen}
        groupName={group.groupName}
        groupId={groupId}
      />
    </div>
  );
}

export default GroupDescriptionSettings;
