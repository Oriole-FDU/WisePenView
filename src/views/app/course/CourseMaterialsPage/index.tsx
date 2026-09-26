import { useTranslation } from 'react-i18next';

import DriveBrowser from '@/components/business/Drive/DriveBrowser';
import { COURSE_ROLE } from '@/domains/Course';
import { useCourseContext } from '@/layouts/Course/_context';

import styles from './style.module.less';

function CourseMaterialsPage() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const canManage =
    course.myRole === COURSE_ROLE.TEACHER || course.myRole === COURSE_ROLE.ASSISTANT;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t('materials.title')}</h1>
        <p>{t('materials.description')}</p>
      </header>
      <div className={styles.driveArea}>
        <DriveBrowser
          scope={{ type: 'group', groupId: course.courseId }}
          actions={{
            toolbar: {
              canCreateFolder: canManage,
              canCreateNote: canManage,
              canCreateDrawio: canManage,
              canCreateSkill: false,
              canCreateAgent: false,
              canUploadToGroup: canManage,
              canManageTagPermission: canManage,
            },
          }}
        />
      </div>
    </div>
  );
}

export default CourseMaterialsPage;
