import { Spin } from '@/components/Feedback';
import { useCourseService } from '@/domains';
import { useCourseContext } from '@/layouts/Course/CourseContext';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Bell, Pin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import sharedStyles from '../_styles/contextPage.module.less';
import styles from './style.module.less';

function CourseAnnouncementsPage() {
  const { t, i18n } = useTranslation('course');
  const { course } = useCourseContext();
  const courseService = useCourseService();
  const { data, loading, error, refresh } = useRequest(() =>
    courseService.listCourseAnnouncements(course.courseId)
  );

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

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
          <Button variant="secondary" onPress={refresh}>
            {t('common.retry')}
          </Button>
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
                    {formatDateTime(announcement.publishTime)}
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
