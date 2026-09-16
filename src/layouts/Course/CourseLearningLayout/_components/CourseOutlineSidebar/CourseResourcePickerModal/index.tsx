import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import type { DriveSelectionItem } from '@/components/business/Drive/common/driveComponentModel';
import DriveNavigator from '@/components/business/Drive/DriveNavigator';
import { useCourseService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { usePickerSelection } from '@/hooks/usePickerSelection';

import styles from './style.module.less';

interface CourseResourcePickerModalProps {
  isOpen: boolean;
  courseId: string;
  targetNodeId: string;
  targetName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CourseResourcePickerModal({
  isOpen,
  courseId,
  targetNodeId,
  targetName,
  onOpenChange,
  onSuccess,
}: CourseResourcePickerModalProps) {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const selection = usePickerSelection<string[]>({
    initialValue: [],
    getCount: (value) => value.length,
  });

  const close = () => {
    selection.clear();
    onOpenChange(false);
  };

  const { loading, run: mountResources } = useApi(
    () =>
      courseService.mountCourseOutlineResources({
        courseId,
        targetNodeId,
        resourceIds: selection.value,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('editor.outline.mountSuccess', { count: selection.count }));
        onSuccess();
        close();
      },
    }
  );

  const handleSelectionChange = (items: DriveSelectionItem[]) => {
    selection.setValue(
      items
        .filter((item) => item.kind === 'resource' || item.kind === 'link')
        .map((item) => item.resourceId)
        .filter((resourceId): resourceId is string => Boolean(resourceId))
    );
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) close();
      }}
      title={t('editor.outline.cloudPickerTitle')}
      description={t('editor.outline.cloudPickerDescription', { name: targetName })}
      size="md"
      isDismissable={!loading}
      actions={
        <>
          <AppButton variant="secondary" isDisabled={loading} onPress={close}>
            {t('editor.actions.cancel')}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={loading || !selection.canConfirm}
            onPress={mountResources}
          >
            {t('editor.outline.mountSelected', { count: selection.count })}
          </AppButton>
        </>
      }
    >
      <div className={styles.resourcePickerBody}>
        <DriveNavigator
          scope={{ type: 'personal' }}
          selectableTypes={['resource', 'link']}
          multiple
          disabled={loading}
          onChange={handleSelectionChange}
        />
      </div>
    </AppModal>
  );
}

export default CourseResourcePickerModal;
