import { useCourseContext } from '@/layouts/Course/CourseContext';
import { Tabs } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import CourseHomeTab from './_components/CourseHomeTab';
import CourseInfoTab from './_components/CourseInfoTab';
import styles from './style.module.less';

const COURSE_CONTEXT_TAB_KEYS = ['home', 'info'] as const;
type CourseContextTabKey = (typeof COURSE_CONTEXT_TAB_KEYS)[number];

const resolveInitialTab = (value: string | null): CourseContextTabKey =>
  COURSE_CONTEXT_TAB_KEYS.includes(value as CourseContextTabKey)
    ? (value as CourseContextTabKey)
    : 'home';

function CourseContextPage() {
  const { t } = useTranslation('course');
  const { course } = useCourseContext();
  const [searchParams] = useSearchParams();
  const [activeTabKey, setActiveTabKey] = useState<CourseContextTabKey>(() =>
    resolveInitialTab(searchParams.get('tab'))
  );
  const tabItems = [
    { key: 'home', label: t('nav.home') },
    { key: 'info', label: t('nav.info') },
  ] satisfies { key: CourseContextTabKey; label: string }[];
  const courseKicker = [course.term, course.category].filter(Boolean).join(' · ');

  const activeTabContent = (() => {
    switch (activeTabKey) {
      case 'info':
        return <CourseInfoTab />;
      default:
        return <CourseHomeTab />;
    }
  })();

  return (
    <div className={styles.root}>
      <header className={styles.courseHeader}>
        <div className={styles.courseKicker}>{courseKicker}</div>
        <div className={styles.courseTitleRow}>
          <h1>{course.name}</h1>
        </div>
        <p>{course.description}</p>
        <div className={styles.courseMeta}>
          <span>{course.teacher.name}</span>
          {course.teachingWeek ? (
            <span>{t('header.teachingWeek', { week: course.teachingWeek })}</span>
          ) : null}
          <span>{t('header.members', { count: course.memberCount })}</span>
        </div>
      </header>

      <div className={styles.contextTabsFrame}>
        <Tabs
          variant="secondary"
          selectedKey={activeTabKey}
          onSelectionChange={(key) => {
            const nextKey = String(key);
            if (COURSE_CONTEXT_TAB_KEYS.includes(nextKey as CourseContextTabKey)) {
              setActiveTabKey(nextKey as CourseContextTabKey);
            }
          }}
          className={styles.contextTabs}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('nav.contextTabsAria')}>
              {tabItems.map((item) => (
                <Tabs.Tab key={item.key} id={item.key}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <div
        className={`${styles.tabContent} ${activeTabKey === 'home' ? styles.homeTabContent : ''}`}
      >
        {activeTabContent}
      </div>
    </div>
  );
}

export default CourseContextPage;
