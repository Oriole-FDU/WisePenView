import { Chip } from '@heroui/react';
import { Bell, Pin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';
import { useCourseService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';

import sharedStyles from '../_styles/contextPage.module.less';
import styles from './style.module.less';

function CourseAnnouncementsPage() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const courseService = useCourseService();
  const { data, loading, error, refresh } = useApi(() =>
    courseService.listCourseAnnouncements(course.courseId)
  );

  const announcements = data ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t('announcements.title')}</h1>
        <p>{t('announcements.count', { count: announcements.length })}</p>
      </header>
      {loading ? (
        <div className={sharedStyles.state}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className={sharedStyles.state}>
          <span>{parseErrorMessage(error)}</span>
          <AppButton variant="secondary" onPress={refresh}>
            {t('common.retry')}
          </AppButton>
        </div>
      ) : announcements.length > 0 ? (
        <div className={styles.announcementFeed}>
          {announcements.map((announcement) => (
            <article key={announcement.announcementId} className={styles.announcementItem}>
              <span className={styles.announcementMarker}>
                <Bell size={18} aria-hidden />
              </span>
              <div className={styles.announcementBody}>
                <div className={styles.announcementTitleRow}>
                  <div>
                    <h3>{announcement.title}</h3>
                    {announcement.pinned ? (
                      <Chip size="sm" variant="soft">
                        <Pin size={12} aria-hidden />
                        <Chip.Label>{t('announcements.pinned')}</Chip.Label>
                      </Chip>
                    ) : null}
                  </div>
                  <time dateTime={announcement.publishTime}>
                    {formatTimestampToDateTime(announcement.publishTime)}
                  </time>
                </div>
                <p>{announcement.content}</p>
                <small>
                  {t('announcements.publishedBy', { name: announcement.publisher.name })}
                </small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={sharedStyles.state}>{t('announcements.empty')}</div>
      )}
    </div>
  );
}

export default CourseAnnouncementsPage;
