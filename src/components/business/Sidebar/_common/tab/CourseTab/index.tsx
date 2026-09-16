import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Spin } from '@/components/base/Feedback';
import Tree, { type TreeDataNode } from '@/components/base/Tree';
import { useCourseService } from '@/domains';
import type { CourseSummary } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';
import { buildCourseLearningPath } from '@/utils/navigation/appRoute';

import styles from './style.module.less';

function toCourseTreeData(courses: CourseSummary[]): TreeDataNode[] {
  return courses.map((course) => ({
    key: `course:${course.courseId}`,
    title: (
      <span className={styles.nodeTitle}>
        <span className={styles.nodeMain}>
          <span className={styles.nodeIcon} aria-hidden="true">
            <BookOpen size={16} />
          </span>
          <span className={styles.nodeLabel} title={course.name}>
            {course.name}
          </span>
        </span>
      </span>
    ),
    isLeaf: true,
  }));
}

function CourseTab() {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();

  const { data, loading } = useApi(() => courseService.listMyCourses({ page: 1, size: 50 }));

  if (loading) {
    return (
      <div className={styles.state}>
        <Spin size="small" tip={t('sidebar.loading')} />
      </div>
    );
  }

  const treeData = toCourseTreeData(data?.list ?? []);

  return (
    <div className={styles.root}>
      {treeData.length > 0 ? (
        <Tree
          blockNode
          selectable
          className={styles.tree}
          treeData={treeData}
          selectedKeys={courseId ? [`course:${courseId}`] : []}
          onSelect={(_keys, info) => {
            const key = String(info.node.key);
            if (key.startsWith('course:')) {
              navigate(buildCourseLearningPath(key.slice('course:'.length)));
            }
          }}
        />
      ) : (
        <div className={styles.state}>{t('sidebar.empty')}</div>
      )}
    </div>
  );
}

export default CourseTab;
