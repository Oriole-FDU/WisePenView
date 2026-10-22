import { ArrowLeft, BookOpen, FolderOpen, Home, Settings, UsersRound } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { registerGuideActionHandlers } from '@/components/base/Guide';
import { GUIDE_ACTION_ID, GUIDE_TOOL_ID } from '@/constants/tour';
import { COURSE_ROLE } from '@/domains/Course';
import {
  APP_ROUTE_PATH,
  buildCourseLearningPath,
  buildCoursePath,
} from '@/utils/navigation/appRoute';
import { buildChatSessionLocation, getChatSessionId } from '@/utils/navigation/chatRoute';

import { useCourseContext } from '../_context';
import styles from './style.module.scss';

function CourseNavigationSidebar() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * @wisepen-manual-effect
   * 执行时机：课程侧栏或当前课程变化时注册引导切页动作。
   * 不可替代原因：引导层直接调用路由跳转，不能依赖对 NavLink 的模拟点击。
   * cleanup：撤销三个动作处理器。
   */
  useEffect(() => {
    const openCoursePage = (page: 'home' | 'materials' | 'members') =>
      navigate(
        buildChatSessionLocation(
          { pathname: buildCoursePath(course.courseId, page) },
          getChatSessionId(location)
        )
      );
    return registerGuideActionHandlers({
      [GUIDE_ACTION_ID.openCourseHome]: {
        open: () => openCoursePage('home'),
      },
      [GUIDE_ACTION_ID.openCourseMaterials]: {
        open: () => openCoursePage('materials'),
      },
      [GUIDE_ACTION_ID.openCourseMembers]: {
        open: () => openCoursePage('members'),
      },
    });
  }, [course.courseId, location, navigate]);

  const navItems = [
    {
      key: 'home',
      label: t('nav.home'),
      icon: Home,
      to: buildCoursePath(course.courseId, 'home'),
      toolId: GUIDE_TOOL_ID.courseNavHome,
    },
    {
      key: 'learning',
      label: t('nav.learning'),
      icon: BookOpen,
      to: buildCourseLearningPath(course.courseId),
      toolId: GUIDE_TOOL_ID.courseNavLearning,
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
      toolId: GUIDE_TOOL_ID.courseNavMaterials,
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
      toolId: GUIDE_TOOL_ID.courseNavMembers,
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
              to={buildChatSessionLocation({ pathname: item.to }, getChatSessionId(location))}
              data-guide-tool-id={item.toolId}
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
