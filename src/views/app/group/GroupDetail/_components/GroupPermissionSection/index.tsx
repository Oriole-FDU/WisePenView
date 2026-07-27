import type { GroupResConfig } from '@/domains/Group';
import { Button } from '@heroui/react';
import { FolderInput, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GroupDefaultAccessPermissionModal from '../GroupDefaultAccessPermissionModal';
import GroupMountPermissionModal from '../GroupMountPermissionModal';
import GroupSettingsSection from '../GroupSettingsSection';
import styles from './style.module.less';

interface GroupPermissionSectionProps {
  groupId: string;
  groupResConfig: GroupResConfig;
  onSuccess: () => void;
}

function GroupPermissionSection({
  groupId,
  groupResConfig,
  onSuccess,
}: GroupPermissionSectionProps) {
  const { t } = useTranslation('group');
  const [accessPermissionOpen, setAccessPermissionOpen] = useState(false);
  const [mountPermissionOpen, setMountPermissionOpen] = useState(false);

  return (
    <>
      <GroupSettingsSection title={t('settings.permissions')} compact>
        <div className={styles.permissionActions}>
          <Button variant="secondary" onPress={() => setAccessPermissionOpen(true)}>
            <ShieldCheck size={16} aria-hidden="true" />
            {t('settings.accessPermission')}
          </Button>
          <Button variant="secondary" onPress={() => setMountPermissionOpen(true)}>
            <FolderInput size={16} aria-hidden="true" />
            {t('settings.mountPermission')}
          </Button>
        </div>
      </GroupSettingsSection>

      {accessPermissionOpen ? (
        <GroupDefaultAccessPermissionModal
          isOpen={accessPermissionOpen}
          groupId={groupId}
          groupResConfig={groupResConfig}
          onOpenChange={setAccessPermissionOpen}
          onSuccess={onSuccess}
        />
      ) : null}
      {mountPermissionOpen ? (
        <GroupMountPermissionModal
          isOpen={mountPermissionOpen}
          onOpenChange={setMountPermissionOpen}
        />
      ) : null}
    </>
  );
}

export default GroupPermissionSection;
