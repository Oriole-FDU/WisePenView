import { toast } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import { useCourseService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import styles from '../../style.module.less';

interface CourseDangerSectionProps {
  courseId: string;
  courseName: string;
}

function CourseDangerSection({ courseId, courseName }: CourseDangerSectionProps) {
  const { t } = useTranslation('course');
  const navigate = useNavigate();
  const courseService = useCourseService();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { loading, run: deleteCourse } = useApi(() => courseService.deleteCourse(courseId), {
    manual: true,
    onSuccess: () => {
      toast.success(t('editor.danger.success'));
      setDeleteDialogOpen(false);
      navigate(APP_ROUTE_PATH.COURSES);
    },
  });

  const handleConfirm = () => {
    if (!courseId) {
      toast.warning(t('editor.danger.missingId'));
      return;
    }
    deleteCourse();
  };

  return (
    <section className={styles.editorSection}>
      <div className={styles.sectionHead}>
        <div>
          <h2>{t('editor.danger.title')}</h2>
          <p>{t('editor.danger.description')}</p>
        </div>
      </div>
      <div className={styles.dangerActions}>
        <AppButton variant="danger" onPress={() => setDeleteDialogOpen(true)}>
          <Trash2 size={16} aria-hidden />
          {t('editor.danger.delete')}
        </AppButton>
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('editor.danger.confirmTitle')}
        description={t('editor.danger.confirmDescription', { name: courseName })}
        confirmText={t('editor.danger.confirm')}
        onConfirm={handleConfirm}
        isConfirmLoading={loading}
        isDismissable={!loading}
      />
    </section>
  );
}

export default CourseDangerSection;
