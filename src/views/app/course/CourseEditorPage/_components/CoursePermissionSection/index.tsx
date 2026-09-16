import { FolderInput, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { TagMountPermissionModal } from '@/components/business/Drive/Modals';
import GroupDefaultAccessPermissionModal from '@/components/business/Group/DefaultAccessPermissionModal';
import { useGroupService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import styles from '../../style.module.less';

interface CoursePermissionSectionProps {
  courseId: string;
  outlineRootTagId?: string;
  onSuccess: () => void;
}

function CoursePermissionSection({
  courseId,
  outlineRootTagId,
  onSuccess,
}: CoursePermissionSectionProps) {
  const { t } = useTranslation(['course', 'group']);
  const groupService = useGroupService();
  const [accessPermissionOpen, setAccessPermissionOpen] = useState(false);
  const [mountPermissionOpen, setMountPermissionOpen] = useState(false);
  const {
    data: groupResConfig,
    loading,
    refresh,
  } = useApi(() => groupService.fetchGroupResConfig(courseId), {
    refreshDeps: [courseId],
    getErrorMessage: () => t('editor.permissions.loadFailed'),
  });

  const handlePermissionSuccess = () => {
    refresh();
    onSuccess();
  };

  return (
    <>
      <div className={styles.permissionActions}>
        <AppButton
          variant="secondary"
          isDisabled={loading || !groupResConfig}
          onPress={() => setAccessPermissionOpen(true)}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          {t('editor.permissions.access')}
        </AppButton>
        <AppButton
          variant="secondary"
          isDisabled={!outlineRootTagId}
          onPress={() => setMountPermissionOpen(true)}
        >
          <FolderInput size={16} aria-hidden="true" />
          {t('editor.permissions.mount')}
        </AppButton>
      </div>

      {accessPermissionOpen && groupResConfig ? (
        <GroupDefaultAccessPermissionModal
          isOpen={accessPermissionOpen}
          groupId={courseId}
          groupResConfig={groupResConfig}
          onOpenChange={setAccessPermissionOpen}
          onSuccess={handlePermissionSuccess}
        />
      ) : null}
      {mountPermissionOpen && outlineRootTagId ? (
        <TagMountPermissionModal
          isOpen={mountPermissionOpen}
          groupId={courseId}
          initialTagId={outlineRootTagId}
          onOpenChange={setMountPermissionOpen}
          onSuccess={handlePermissionSuccess}
        />
      ) : null}
    </>
  );
}

export default CoursePermissionSection;
