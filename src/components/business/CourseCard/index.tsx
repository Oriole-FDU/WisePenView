import { Card } from '@heroui/react';
import type { KeyboardEvent, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import UserCapsule from '@/components/business/UserCapsule';
import type { CourseSummary } from '@/domains/Course';
import { PLACEHOLDER_IMAGE } from '@/utils/image/placeholder';

import styles from './style.module.less';

interface CourseCardProps {
  course: CourseSummary;
  onClick: (course: CourseSummary) => void;
}

function CourseCard({ course, onClick }: CourseCardProps) {
  const { t } = useTranslation('course');
  const summaryText =
    course.pendingAssignmentCount && course.pendingAssignmentCount > 0
      ? t('list.pendingAssignments', { count: course.pendingAssignmentCount })
      : course.readResourceCount !== undefined && course.totalResourceCount !== undefined
        ? t('list.progress', {
            read: course.readResourceCount,
            total: course.totalResourceCount,
          })
        : course.term;

  const handleCardClick = () => {
    onClick(course);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  };

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  return (
    <Card
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className={styles.cover}>
        <img
          src={course.coverUrl || PLACEHOLDER_IMAGE}
          alt={course.name}
          loading="lazy"
          onError={handleImageError}
          className={styles.image}
        />
      </div>
      <div className={styles.body}>
        <Card.Header className={styles.header}>
          <Card.Title className={styles.title}>{course.name}</Card.Title>
        </Card.Header>
        <Card.Footer className={styles.footer}>
          <UserCapsule name={course.teacherName} />
          <span className={styles.progress}>{summaryText}</span>
        </Card.Footer>
      </div>
    </Card>
  );
}

export default CourseCard;
