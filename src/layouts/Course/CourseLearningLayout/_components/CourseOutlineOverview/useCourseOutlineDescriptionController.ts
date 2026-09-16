import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCourseService } from '@/domains';
import { useApi } from '@/hooks/useApi';

interface UseCourseOutlineDescriptionControllerOptions {
  courseId: string;
  nodeId: string;
  initialDescription?: string;
  onSaved: () => void;
}

export const useCourseOutlineDescriptionController = ({
  courseId,
  nodeId,
  initialDescription,
  onSaved,
}: UseCourseOutlineDescriptionControllerOptions) => {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const [description, setDescription] = useState(initialDescription ?? '');
  const [draft, setDraft] = useState(initialDescription ?? '');
  const [editing, setEditing] = useState(false);

  const saveRequest = useApi(
    async () => {
      const normalizedDescription = draft.trim();
      await courseService.updateCourseOutlineSectionDescription({
        courseId,
        nodeId,
        description: normalizedDescription,
      });
      return normalizedDescription;
    },
    {
      manual: true,
      onSuccess: (nextDescription) => {
        setDescription(nextDescription);
        setEditing(false);
        onSaved();
        toast.success(t('outline.descriptionSaved'));
      },
    }
  );

  return {
    description,
    draft,
    editing,
    saving: saveRequest.loading,
    setDraft,
    startEditing: () => {
      setDraft(description);
      setEditing(true);
    },
    cancelEditing: () => {
      setDraft(description);
      setEditing(false);
    },
    save: saveRequest.run,
  };
};
