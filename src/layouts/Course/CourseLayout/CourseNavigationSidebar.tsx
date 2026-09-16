import { ArrowLeft, BookOpen, FolderOpen, Home, Settings, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { COURSE_ROLE } from '@/domains/Course';
import {
  APP_ROUTE_PATH,
  buildCourseLearningPath,
  buildCoursePath,
} from '@/utils/navigation/appRoute';

import { useCourseContext } from '../CourseContext';
import styles from './style.module.less';

function CourseNavigationSidebar() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const navigate = useNavigate();
  const navItems = [
    { key: 'home', label: t('nav.home'), icon: Home, to: buildCoursePath(course.courseId, 'home') },
    {
      key: 'learning',
      label: t('nav.learning'),
      icon: BookOpen,
      to: buildCourseLearningPath(course.courseId),
    },
    // 暂时隐藏作业入口，避免从左侧栏直接访问。
    // {
    //   key: 'assignments',
    //   label: t('nav.assignments'),
    //   icon: ClipboardCheck,
    //   to: buildCourseAssignmentPath(course.courseId),
    //   badge: course.pendingAssignmentCount,
    // },
    {
      key: 'materials',
      label: t('nav.materials'),
      icon: FolderOpen,
      to: buildCoursePath(course.courseId, 'materials'),
    },
    // 暂时隐藏公告入口，避免从左侧栏直接访问。
    // {
    //   key: 'announcements',
    //   label: t('nav.announcements'),
    //   icon: Bell,
    //   to: buildCoursePath(course.courseId, 'announcements'),
    // },
    {
      key: 'members',
      label: t('nav.members'),
      icon: UsersRound,
      to: buildCoursePath(course.courseId, 'members'),
    },
    ...(course.myRole === COURSE_ROLE.TEACHER
      ? [
          {
            key: 'settings',
            label: t('nav.edit'),
            icon: Settings,
            to: buildCoursePath(course.courseId, 'settings'),
          },
        ]
      : []),
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <AppButton
          variant="ghost"
          size="sm"
          className={styles.backLink}
          onPress={() => navigate(APP_ROUTE_PATH.COURSES)}
        >
          <ArrowLeft size={16} aria-hidden />
          {t('common.backToCourseGroups')}
        </AppButton>
        <div className={styles.courseName}>
          <BookOpen size={18} aria-hidden />
          <strong>{course.name}</strong>
        </div>
      </div>
      <nav className={styles.courseNav} aria-label={t('nav.home')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={17} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default CourseNavigationSidebar;
