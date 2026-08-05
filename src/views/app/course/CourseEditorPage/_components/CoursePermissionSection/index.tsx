import { TagMountPermissionModal } from '@/components/Drive/Modals';
import GroupDefaultAccessPermissionModal from '@/components/Group/DefaultAccessPermissionModal';
import { useGroupService } from '@/domains';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { FolderInput, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  } = useRequest(() => groupService.fetchGroupResConfig(courseId), {
    refreshDeps: [courseId],
    onError: () => toast.danger(t('editor.permissions.loadFailed')),
  });

  const handlePermissionSuccess = () => {
    refresh();
    onSuccess();
  };

  return (
    <>
      <div className={styles.permissionActions}>
        <Button
          variant="secondary"
          isDisabled={loading || !groupResConfig}
          onPress={() => setAccessPermissionOpen(true)}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          {t('editor.permissions.access')}
        </Button>
        <Button
          variant="secondary"
          isDisabled={!outlineRootTagId}
          onPress={() => setMountPermissionOpen(true)}
        >
          <FolderInput size={16} aria-hidden="true" />
          {t('editor.permissions.mount')}
        </Button>
      </div>

      {groupResConfig ? (
        <GroupDefaultAccessPermissionModal
          isOpen={accessPermissionOpen}
          groupId={courseId}
          groupResConfig={groupResConfig}
          onOpenChange={setAccessPermissionOpen}
          onSuccess={handlePermissionSuccess}
        />
      ) : null}
      {outlineRootTagId ? (
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
