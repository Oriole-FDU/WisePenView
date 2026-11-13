import { toast } from '@heroui/react';
import { type SyntheticEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PLACEHOLDER_IMAGE } from '@/constants/placeholderImage';
import { useCourseService, useImageService } from '@/domains';
import type { CourseAssessmentItem, CourseDetail, CourseMeeting } from '@/domains/Course';
import { useApi } from '@/hooks/useApi';
import { useFormValidation } from '@/hooks/useFormValidation';
import { parseErrorMessage } from '@/utils/error';
import { assertImageProxyUploadLimit } from '@/utils/image/uploadLimit';

import {
  mapCourseDetailToEditorForm,
  mapCourseEditorFormToUpdateRequest,
} from '../courseEditorForm.mapper';
import { type CourseEditorForm, getCourseAssessmentTotal } from '../model';

interface UseCourseEditorFormControllerParams {
  course: CourseDetail;
  refreshCourse: () => void;
}

type CourseEditorField = keyof CourseEditorForm;

const COURSE_EDITOR_VALIDATION_FIELDS: CourseEditorField[] = ['name', 'term', 'assessmentItems'];

export function useCourseEditorFormController({
  course,
  refreshCourse,
}: UseCourseEditorFormControllerParams) {
  const { t } = useTranslation('course');
  const courseService = useCourseService();
  const imageService = useImageService();
  const validateField = (
    field: CourseEditorField,
    values: CourseEditorForm
  ): string | undefined => {
    switch (field) {
      case 'name':
        return values.name.trim() ? undefined : t('editor.validation.nameRequired');
      case 'term':
        return values.term.trim() ? undefined : t('editor.validation.termRequired');
      case 'assessmentItems': {
        if (values.assessmentItems.length === 0) {
          return t('editor.validation.assessmentRequired');
        }
        if (values.assessmentItems.some((item) => !item.label.trim())) {
          return t('editor.validation.assessmentLabelRequired');
        }
        return values.assessmentItems.some(
          (item) => !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100
        )
          ? t('editor.validation.assessmentWeightRange')
          : undefined;
      }
      default:
        return undefined;
    }
  };
  const isFieldEmpty = (field: CourseEditorField, values: CourseEditorForm) => {
    switch (field) {
      case 'name':
        return values.name.trim().length === 0;
      case 'term':
        return values.term.trim().length === 0;
      case 'assessmentItems':
        return values.assessmentItems.length === 0;
      default:
        return false;
    }
  };
  const validation = useFormValidation<CourseEditorForm, CourseEditorField>({
    initialValues: () => mapCourseDetailToEditorForm(course),
    fields: COURSE_EDITOR_VALIDATION_FIELDS,
    validateField,
    isFieldEmpty,
  });
  const form = validation.values;
  const [saved, setSaved] = useState(true);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [modalCoverFile, setModalCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>();
  const coverPreviewRequestRef = useRef(0);

  const { loading: saving, runAsync: saveCourse } = useApi(
    async () => {
      let coverUrl = form.coverUrl.trim() || undefined;
      if (coverFile) {
        const uploadResult = await imageService.uploadImage({
          file: coverFile,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: `groups/${course.courseId}`,
        });
        coverUrl = uploadResult.publicUrl;
      }
      await courseService.updateCourse(
        mapCourseEditorFormToUpdateRequest({
          courseId: course.courseId,
          coverUrl,
          form,
        })
      );
      return coverUrl;
    },
    {
      manual: true,
      onSuccess: (coverUrl) => {
        coverPreviewRequestRef.current += 1;
        setCoverFile(null);
        setCoverPreview(coverUrl);
        validation.changeField('coverUrl', coverUrl ?? '');
        setSaved(true);
        refreshCourse();
        toast.success(t('editor.saveSuccess'));
      },
    }
  );

  const updateForm = <K extends keyof CourseEditorForm>(key: K, value: CourseEditorForm[K]) => {
    validation.changeField(key as CourseEditorField, value);
    setSaved(false);
  };

  const saveCourseRequest = async () => {
    if (!validation.validateForm()) return false;
    try {
      await saveCourse();
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    void saveCourseRequest();
  };

  const handleCoverFileChange = (file: File | null) => {
    if (!file) {
      setModalCoverFile(null);
      return;
    }
    try {
      assertImageProxyUploadLimit(file);
      setModalCoverFile(file);
    } catch (error: unknown) {
      toast.danger(parseErrorMessage(error));
    }
  };

  const handleConfirmCover = () => {
    if (!modalCoverFile) return;
    setCoverFile(modalCoverFile);
    const requestId = coverPreviewRequestRef.current + 1;
    coverPreviewRequestRef.current = requestId;
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== coverPreviewRequestRef.current || typeof reader.result !== 'string') return;
      setCoverPreview(reader.result);
      setSaved(false);
    };
    reader.readAsDataURL(modalCoverFile);
    setModalCoverFile(null);
    setCoverModalOpen(false);
  };

  const handleCoverModalOpenChange = (open: boolean) => {
    setCoverModalOpen(open);
    if (!open) setModalCoverFile(null);
  };

  const handleCoverImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  const updateMeeting = (meetingId: string, patch: Partial<CourseMeeting>) => {
    updateForm(
      'meetings',
      form.meetings.map((meeting) =>
        meeting.meetingId === meetingId ? { ...meeting, ...patch } : meeting
      )
    );
  };

  const updateAssessment = (editorId: string, patch: Partial<CourseAssessmentItem>) => {
    updateForm(
      'assessmentItems',
      form.assessmentItems.map((item) =>
        item.editorId === editorId ? { ...item, ...patch } : item
      )
    );
  };

  const updateDeadlineDate = (value: string) => {
    updateForm('finalAssessment', {
      ...form.finalAssessment,
      deadline: value ? `${value}T${form.finalAssessmentDeadlineTime}` : undefined,
    });
  };

  const updateDeadlineTime = (value: string) => {
    const nextTime = value || '23:59';
    const deadlineDate = form.finalAssessment.deadline?.split('T')[0];
    validation.changeValues({
      finalAssessmentDeadlineTime: nextTime,
      finalAssessment: deadlineDate
        ? { ...form.finalAssessment, deadline: `${deadlineDate}T${nextTime}` }
        : form.finalAssessment,
    });
    setSaved(false);
  };

  const noFinalAssessmentValue = t('editor.assessment.noneValue');
  return {
    form,
    updateForm,
    updateMeeting,
    updateAssessment,
    updateDeadlineDate,
    updateDeadlineTime,
    assessmentTotal: getCourseAssessmentTotal(form.assessmentItems),
    noFinalAssessmentValue,
    hasNoFinalAssessment:
      form.finalAssessment.type === 'OTHER' &&
      form.finalAssessment.customName?.trim() === noFinalAssessmentValue,
    saved,
    saving,
    errors: validation.errors,
    handleSave,
    saveCourseRequest,
    blurField: validation.blurField,
    cover: {
      isOpen: coverModalOpen,
      modalFile: modalCoverFile,
      displayUrl: coverPreview ?? (form.coverUrl || PLACEHOLDER_IMAGE),
      handleOpenChange: handleCoverModalOpenChange,
      handleFileChange: handleCoverFileChange,
      handleConfirm: handleConfirmCover,
      handleImageError: handleCoverImageError,
    },
  };
}
