import { Input, TextArea } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import { useCourseService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Label, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EMPTY_COURSE_CREATE_FORM,
  mapCourseCreateFormToRequest,
  type CourseCreateForm,
} from './createCourseForm.mapper';
import styles from './style.module.less';

interface CreateCourseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (courseId: string) => void;
}

function CreateCourseModal({ isOpen, onOpenChange, onCreated }: CreateCourseModalProps) {
  const { t } = useTranslation(['course', 'common']);
  const courseService = useCourseService();
  const [form, setForm] = useState<CourseCreateForm>(EMPTY_COURSE_CREATE_FORM);
  const request = useRequest(() => courseService.createCourse(mapCourseCreateFormToRequest(form)), {
    manual: true,
    onSuccess: (courseId) => {
      toast.success(t('create.success'));
      setForm(EMPTY_COURSE_CREATE_FORM);
      onOpenChange(false);
      onCreated(courseId);
    },
    onError: (error: unknown) => toast.danger(parseErrorMessage(error)),
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
          <Button
            variant="secondary"
            isDisabled={request.loading}
            onPress={() => onOpenChange(false)}
          >
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button variant="primary" isPending={request.loading} onPress={handleCreate}>
            {t('create.confirm')}
          </Button>
        </>
      }
    >
      <div className={styles.createForm}>
        <TextField
          value={form.name}
          onChange={(name) => setForm((current) => ({ ...current, name }))}
          aria-label={t('create.name')}
          isRequired
        >
          <Label>{t('create.name')}</Label>
          <Input placeholder={t('create.namePlaceholder')} />
        </TextField>
        <TextField
          value={form.term}
          onChange={(term) => setForm((current) => ({ ...current, term }))}
          aria-label={t('create.term')}
          isRequired
        >
          <Label>{t('create.term')}</Label>
          <Input placeholder={t('create.termPlaceholder')} />
        </TextField>
        <TextField
          value={form.category}
          onChange={(category) => setForm((current) => ({ ...current, category }))}
          aria-label={t('create.category')}
        >
          <Label>{t('create.category')}</Label>
          <Input placeholder={t('create.categoryPlaceholder')} />
        </TextField>
        <TextField
          value={form.description}
          onChange={(description) => setForm((current) => ({ ...current, description }))}
          aria-label={t('create.intro')}
          isRequired
        >
          <Label>{t('create.intro')}</Label>
          <TextArea rows={4} placeholder={t('create.introPlaceholder')} />
        </TextField>
      </div>
    </AppModal>
  );
}

export default CreateCourseModal;
