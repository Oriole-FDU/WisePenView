import { useTranslation } from 'react-i18next';

import type { CourseEditorSectionId } from '../../model';
import styles from '../../style.module.less';

interface CourseEditorNavProps {
  activeSection: CourseEditorSectionId;
  onNavigate: (sectionId: CourseEditorSectionId) => void;
}

function CourseEditorNav({ activeSection, onNavigate }: CourseEditorNavProps) {
  const { t } = useTranslation('course');
  const groups = [
    {
      title: t('editor.groups.info'),
      items: [
        ['course-editor-basic', t('editor.nav.basic')],
        ['course-editor-goals', t('editor.nav.goals')],
        ['course-editor-schedule', t('editor.nav.schedule')],
        ['course-editor-assessment', t('editor.nav.assessment')],
      ],
    },
    {
      title: t('editor.groups.management'),
      items: [['course-editor-access', t('editor.nav.access')]],
    },
  ] as const;

  return (
    <nav className={styles.editorNav} aria-label={t('editor.navigationAria')}>
      {groups.map((group) => (
        <div key={group.title} className={styles.editorNavGroup}>
          <h2>{group.title}</h2>
          {group.items.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={activeSection === id ? styles.active : undefined}
              onClick={() => onNavigate(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

export default CourseEditorNav;
