import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { FormField, Input, TextArea } from '@/components/base/Input';
import { useCourseService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import styles from './style.module.less';

interface CreateCourseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (courseId: string) => void;
}

interface CourseCreateFormValues {
  name: string;
  description: string;
  term: string;
  category: string;
}

const DEFAULT_FORM_VALUES: CourseCreateFormValues = {
  name: '',
  description: '',
  term: '',
  category: '',
};

const toCreateCourseRequest = (form: CourseCreateFormValues) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  term: form.term.trim(),
  category: form.category.trim() || undefined,
});

function CreateCourseModal({ isOpen, onOpenChange, onCreated }: CreateCourseModalProps) {
  const { t } = useTranslation(['course', 'common']);
  const courseService = useCourseService();
  const [form, setForm] = useState<CourseCreateFormValues>(DEFAULT_FORM_VALUES);
  const request = useApi(() => courseService.createCourse(toCreateCourseRequest(form)), {
    manual: true,
    onSuccess: (courseId) => {
      toast.success(t('create.success'));
      setForm(DEFAULT_FORM_VALUES);
      onOpenChange(false);
      onCreated(courseId);
    },
  });

  const handleCreate = () => {
    if (!form.name.trim() || !form.description.trim() || !form.term.trim()) {
      toast.warning(t('create.required'));
      return;
    }
    request.run();
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('create.title')}
      description={t('create.description')}
      size="md"
      isDismissable={!request.loading}
      actions={
        <>
          <AppButton
            variant="secondary"
            isDisabled={request.loading}
            onPress={() => onOpenChange(false)}
          >
            {t('actions.cancel', { ns: 'common' })}
          </AppButton>
          <AppButton variant="primary" isPending={request.loading} onPress={handleCreate}>
            {t('create.confirm')}
          </AppButton>
        </>
      }
    >
      <div className={styles.createForm}>
        <FormField
          label={t('create.name')}
          value={form.name}
          onChange={(name) => setForm((current) => ({ ...current, name }))}
          aria-label={t('create.name')}
          isRequired
        >
          <Input placeholder={t('create.namePlaceholder')} />
        </FormField>
        <FormField
          label={t('create.term')}
          value={form.term}
          onChange={(term) => setForm((current) => ({ ...current, term }))}
          aria-label={t('create.term')}
          isRequired
        >
          <Input placeholder={t('create.termPlaceholder')} />
        </FormField>
        <FormField
          label={t('create.category')}
          value={form.category}
          onChange={(category) => setForm((current) => ({ ...current, category }))}
          aria-label={t('create.category')}
        >
          <Input placeholder={t('create.categoryPlaceholder')} />
        </FormField>
        <FormField
          label={t('create.intro')}
          value={form.description}
          onChange={(description) => setForm((current) => ({ ...current, description }))}
          aria-label={t('create.intro')}
          isRequired
        >
          <TextArea rows={4} placeholder={t('create.introPlaceholder')} />
        </FormField>
      </div>
    </AppModal>
  );
}

export default CreateCourseModal;
