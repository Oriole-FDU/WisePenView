import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useCourseService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  const { loading, run: deleteCourse } = useRequest(() => courseService.deleteCourse(courseId), {
    manual: true,
    onSuccess: () => {
      toast.success(t('editor.danger.success'));
      setDeleteDialogOpen(false);
      navigate('/app/my-group?section=courseGroups');
    },
    onError: (error: unknown) => toast.danger(parseErrorMessage(error)),
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
        <Button variant="danger" onPress={() => setDeleteDialogOpen(true)}>
          <Trash2 size={16} aria-hidden />
          {t('editor.danger.delete')}
        </Button>
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
