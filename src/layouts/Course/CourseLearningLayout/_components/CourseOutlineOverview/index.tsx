import { ChevronRight, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { FormField, TextArea } from '@/components/base/Input';
import type { CourseOutlineContainerNode, CourseOutlineResourceNode } from '@/domains/Course';

import CourseResourceIcon from '../CourseResourceIcon';
import styles from './style.module.less';
import { useCourseOutlineDescriptionController } from './useCourseOutlineDescriptionController';

interface CourseOutlineOverviewProps {
  courseId: string;
  node: CourseOutlineContainerNode;
  resources: CourseOutlineResourceNode[];
  editable: boolean;
  onOpenResource: (nodeId: string) => void;
  onSaved: () => void;
}

function CourseOutlineOverview({
  courseId,
  node,
  resources,
  editable,
  onOpenResource,
  onSaved,
}: CourseOutlineOverviewProps) {
  const { t } = useTranslation('course');
  const description = useCourseOutlineDescriptionController({
    courseId,
    nodeId: node.nodeId,
    initialDescription: node.description,
    onSaved,
  });

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <section className={styles.folderInfo}>
          <div className={styles.titleRow}>
            <h1>{node.title}</h1>
            {editable && !description.editing ? (
              <AppIconButton
                icon={<Pencil size={16} aria-hidden />}
                label={t('outline.editDescription')}
                size="sm"
                onPress={description.startEditing}
              />
            ) : null}
          </div>

          {description.editing ? (
            <div className={styles.descriptionEditor}>
              <FormField
                label={t('outline.descriptionLabel')}
                labelClassName={styles.visuallyHidden}
                aria-label={t('outline.descriptionLabel')}
                value={description.draft}
                onChange={description.setDraft}
              >
                <TextArea rows={5} placeholder={t('outline.descriptionPlaceholder')} />
              </FormField>
              <div className={styles.editorActions}>
                <AppButton
                  size="sm"
                  variant="secondary"
                  isDisabled={description.saving}
                  onPress={description.cancelEditing}
                >
                  {t('outline.cancelDescription')}
                </AppButton>
                <AppButton
                  size="sm"
                  variant="primary"
                  isDisabled={description.saving}
                  aria-busy={description.saving || undefined}
                  onPress={description.save}
                >
                  {t('outline.saveDescription')}
                </AppButton>
              </div>
            </div>
          ) : editable && !description.description ? (
            <button
              type="button"
              className={styles.emptyDescriptionButton}
              onClick={description.startEditing}
            >
              {t('outline.emptyEditableDescription')}
            </button>
          ) : (
            <p className={styles.description} data-empty={!description.description || undefined}>
              {description.description || t('outline.emptyDescription')}
            </p>
          )}
        </section>

        <p className={styles.resourceCount}>
          {t('outline.resourceCount', { count: resources.length })}
        </p>
        <div className={styles.resourceList}>
          {resources.map((resource) => (
            <button
              key={resource.nodeId}
              type="button"
              onClick={() => onOpenResource(resource.nodeId)}
            >
              <CourseResourceIcon node={resource} size={18} />
              <span>
                <strong>{resource.title}</strong>
                <small>
                  {resource.read ? t('outline.read') : t('outline.unread')}
                  {resource.durationLabel ? ` · ${resource.durationLabel}` : ''}
                </small>
              </span>
              <ChevronRight size={17} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CourseOutlineOverview;
